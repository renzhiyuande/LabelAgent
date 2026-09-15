"""Bounded tool-using planner for AI review.

The runtime is intentionally narrow:
- the model may call only whitelisted read-only tools;
- every tool input is schema validated;
- the loop has a hard step budget;
- the runtime never changes business workflow state;
- the existing ReviewEngine still owns the final structured scoring contract.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any

from pydantic import ValidationError

from app.core.logging_config import truncate_text
from app.observability.runtime_trace import runtime_trace_recorder
from app.schemas.agent_runtime import (
    AgentAction,
    AgentActionType,
    AgentRunResult,
    AgentStepStatus,
    AgentStepTrace,
    AgentTermination,
)
from app.schemas.trace import TraceEventStatus
from app.services.llm_client import LLMClient, LlmJsonCallResult
from app.services.review_engine import ReviewEngineInput
from app.tools.review_tools import ReviewToolContext, ReviewToolRegistry, ToolExecutionError

logger = logging.getLogger(__name__)


PLANNER_SYSTEM_PROMPT = """你是 LabelHub AI 预审的受控工具规划器。
你的任务不是直接输出最终评分，而是判断在最终审核前是否需要调用确定性工具补充证据。

你每一步只能输出一个 JSON 对象，格式二选一：
1) 调用工具：{"action":"CALL_TOOL","tool":"工具名","arguments":{...}}
2) 结束取证：{"action":"FINALIZE","arguments":{}}

规则：
- 只能使用给出的白名单工具；禁止臆造工具。
- 工具全部只读；你无权修改任务、审核状态、数据库或 Prompt 版本。
- 已有信息足够时直接 FINALIZE，不要为了调用而调用。
- 不输出思维链、长篇分析或解释，只输出动作 JSON。
- 工具结果会在下一步提供给你；最多执行有限步数。
"""


class ReviewAgentRuntime:
    def __init__(
        self,
        *,
        llm_client: LLMClient | None = None,
        tool_registry: ReviewToolRegistry | None = None,
        max_steps: int = 3,
        max_tool_result_chars: int = 4000,
    ) -> None:
        if max_steps < 1:
            raise ValueError("max_steps must be >= 1")
        if max_tool_result_chars < 200:
            raise ValueError("max_tool_result_chars must be >= 200")
        self.llm_client = llm_client or LLMClient()
        self.tool_registry = tool_registry or ReviewToolRegistry()
        self.max_steps = max_steps
        self.max_tool_result_chars = max_tool_result_chars

    def _build_messages(
        self,
        *,
        review_input: ReviewEngineInput,
        user_prompt: str,
    ) -> list[dict[str, str]]:
        tool_schemas = json.dumps(
            self.tool_registry.planner_schemas(),
            ensure_ascii=False,
            separators=(",", ":"),
        )
        source_keys = sorted(review_input.source_data.keys())
        label_keys = sorted(review_input.label_data.keys())
        return [
            {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"审核任务：\n{user_prompt}\n\n"
                    f"sourceData 顶层字段：{json.dumps(source_keys, ensure_ascii=False)}\n"
                    f"submitData 顶层字段：{json.dumps(label_keys, ensure_ascii=False)}\n"
                    f"可用工具：{tool_schemas}\n\n"
                    "请输出下一步动作 JSON。"
                ),
            },
        ]

    def _bounded_result(self, result: dict[str, Any]) -> tuple[dict[str, Any], str]:
        serialized = json.dumps(result, ensure_ascii=False, default=str)
        if len(serialized) <= self.max_tool_result_chars:
            return result, serialized
        preview = truncate_text(serialized, self.max_tool_result_chars)
        return {"truncated": True, "preview": preview}, preview

    def run(
        self,
        *,
        review_input: ReviewEngineInput,
        user_prompt: str,
    ) -> AgentRunResult:
        messages = self._build_messages(review_input=review_input, user_prompt=user_prompt)
        tool_context = ReviewToolContext(
            source_data=review_input.source_data,
            label_data=review_input.label_data,
            memory_context=review_input.memory_context,
        )

        steps: list[AgentStepTrace] = []
        evidence: list[dict[str, Any]] = []
        planner_calls = 0
        tool_calls = 0
        planner_failures = 0
        llm_latency_ms = 0.0
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0

        for step_no in range(1, self.max_steps + 1):
            planner_calls += 1
            try:
                call = self.llm_client.call_with_full_messages(
                    messages=messages,
                    llm_runtime=review_input.llm_runtime,
                    temperature=0.0,
                    seed=(
                        (review_input.stable_seed + step_no - 1) & 0x7FFFFFFF
                        if review_input.stable_seed is not None
                        else None
                    ),
                )
                if not isinstance(call, LlmJsonCallResult):
                    raise TypeError("planner call must return LlmJsonCallResult")
                llm_latency_ms += call.latency_ms
                prompt_tokens += call.prompt_tokens or 0
                completion_tokens += call.completion_tokens or 0
                total_tokens += call.total_tokens or 0
                action = AgentAction.model_validate(call.payload)
            except (ValidationError, TypeError, ValueError, json.JSONDecodeError, Exception) as exc:
                planner_failures += 1
                logger.warning("review-agent planner failure step=%s error=%s", step_no, exc)
                runtime_trace_recorder.record_event(
                    component="review_agent",
                    operation="planner_decision",
                    status=TraceEventStatus.ERROR,
                    attributes={"stepNo": step_no},
                    error=exc,
                )
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            "上一步动作不符合受控 Agent 协议。请只输出合法 JSON，"
                            "action 只能是 CALL_TOOL 或 FINALIZE，并遵守工具 Schema。"
                        ),
                    }
                )
                continue

            if action.action == AgentActionType.FINALIZE:
                step = AgentStepTrace(
                    stepNo=step_no,
                    action=action.action,
                    status=AgentStepStatus.SUCCESS,
                )
                steps.append(step)
                runtime_trace_recorder.record_event(
                    component="review_agent",
                    operation="finalize_evidence",
                    status=TraceEventStatus.SUCCESS,
                    attributes={
                        "stepNo": step_no,
                        "toolCalls": tool_calls,
                        "evidenceCount": len(evidence),
                    },
                )
                return AgentRunResult(
                    termination=AgentTermination.MODEL_FINALIZE,
                    steps=steps,
                    evidence=evidence,
                    plannerCalls=planner_calls,
                    toolCalls=tool_calls,
                    llmLatencyMs=llm_latency_ms,
                    promptTokens=prompt_tokens,
                    completionTokens=completion_tokens,
                    totalTokens=total_tokens,
                )

            tool_name = (action.tool or "").strip()
            tool_calls += 1
            started = time.perf_counter()
            try:
                raw_result = self.tool_registry.execute(
                    name=tool_name,
                    arguments=action.arguments,
                    context=tool_context,
                )
                bounded_result, result_text = self._bounded_result(raw_result)
                duration_ms = (time.perf_counter() - started) * 1000
                evidence_item = {
                    "type": "agent_tool_evidence",
                    "tool": tool_name,
                    "arguments": action.arguments,
                    "result": bounded_result,
                }
                evidence.append(evidence_item)
                steps.append(
                    AgentStepTrace(
                        stepNo=step_no,
                        action=action.action,
                        tool=tool_name,
                        arguments=action.arguments,
                        status=AgentStepStatus.SUCCESS,
                        resultPreview=truncate_text(result_text, 1000),
                        latencyMs=duration_ms,
                    )
                )
                runtime_trace_recorder.record_event(
                    component="review_agent",
                    operation="tool_call",
                    status=TraceEventStatus.SUCCESS,
                    duration_ms=duration_ms,
                    attributes={"stepNo": step_no, "tool": tool_name},
                )
                messages.append(
                    {
                        "role": "assistant",
                        "content": json.dumps(action.model_dump(mode="json"), ensure_ascii=False),
                    }
                )
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            f"[TOOL_RESULT name={tool_name}]\n"
                            f"{json.dumps(bounded_result, ensure_ascii=False)}\n"
                            "请基于当前证据继续选择 CALL_TOOL 或 FINALIZE。"
                        ),
                    }
                )
            except ToolExecutionError as exc:
                duration_ms = (time.perf_counter() - started) * 1000
                steps.append(
                    AgentStepTrace(
                        stepNo=step_no,
                        action=action.action,
                        tool=tool_name,
                        arguments=action.arguments,
                        status=AgentStepStatus.ERROR,
                        errorMessage=str(exc),
                        latencyMs=duration_ms,
                    )
                )
                runtime_trace_recorder.record_event(
                    component="review_agent",
                    operation="tool_call",
                    status=TraceEventStatus.ERROR,
                    duration_ms=duration_ms,
                    attributes={"stepNo": step_no, "tool": tool_name},
                    error=exc,
                )
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            f"工具调用失败：{truncate_text(str(exc), 800)}。"
                            f"可用工具仅有：{', '.join(self.tool_registry.names())}。"
                            "请修正参数/工具名，或直接 FINALIZE。"
                        ),
                    }
                )

        termination = (
            AgentTermination.PLANNER_FAILURE
            if planner_failures == planner_calls
            else AgentTermination.MAX_STEPS
        )
        runtime_trace_recorder.record_event(
            component="review_agent",
            operation="agent_loop_end",
            status=TraceEventStatus.SUCCESS,
            attributes={
                "termination": termination.value,
                "plannerCalls": planner_calls,
                "toolCalls": tool_calls,
                "evidenceCount": len(evidence),
            },
        )
        return AgentRunResult(
            termination=termination,
            steps=steps,
            evidence=evidence,
            plannerCalls=planner_calls,
            toolCalls=tool_calls,
            llmLatencyMs=llm_latency_ms,
            promptTokens=prompt_tokens,
            completionTokens=completion_tokens,
            totalTokens=total_tokens,
        )
