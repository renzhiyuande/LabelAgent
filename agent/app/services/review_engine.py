"""
AI 预审核心算法（无状态、无 DB 依赖）

职责：Prompt 拼装 → LLM 调用 → ReAct 自纠错 → 动态 Schema 校验 → 返回结构化结果。
编排层（Backend / Worker）负责持久化、状态流转与审计。
"""
from __future__ import annotations

import json
import logging
from concurrent.futures import TimeoutError as FuturesTimeoutError
from dataclasses import dataclass, field
from typing import Any

from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.llm_runtime import LlmRuntimeConfig
from app.schemas.llm import create_dynamic_llm_result_model
from app.services.llm_client import LLMClient, LlmJsonCallResult
from app.services.prompt_service import PromptService

logger = logging.getLogger(__name__)

DEFAULT_MAX_REACT_RETRIES = 3


@dataclass
class ReviewEngineInput:
    """单次预审入参，由调用方（Backend）组装后传入。"""

    system_prompt: str
    source_data: dict[str, Any]
    label_data: dict[str, Any]
    dimensions: list[str]
    memory_context: list[dict[str, Any]] = field(default_factory=list)
    llm_runtime: LlmRuntimeConfig | None = None
    stable_seed: int | None = None
    temperature: float = 0.0


@dataclass
class LlmAttemptTrace:
    attempt_no: int
    prompt_snapshot: str
    response_snapshot: str | None
    error_message: str | None
    success: bool
    latency_ms: float | None
    prompt_tokens: int | None
    completion_tokens: int | None
    total_tokens: int | None
    provider_request_id: str | None


@dataclass
class ReviewEngineResult:
    """单次预审出参，含快照字段供 Backend 落库。"""

    success: bool
    verdict: str | None
    reason: str | None
    scores: dict[str, int]
    dimension_reasons: dict[str, str]
    raw_output: dict[str, Any] | None
    attempts: int
    system_prompt: str
    user_prompt: str
    messages: list[dict[str, str]]
    error: str | None = None
    llm_latency_ms: float | None = None
    llm_client_request_id: str | None = None
    llm_completion_id: str | None = None
    consensus_run_count: int | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    attempt_traces: list[LlmAttemptTrace] = field(default_factory=list)


class ReviewEngine:
    """
    无状态预审引擎：仅执行 LLM 推理与结构化校验，不读写任何持久化存储。
    """

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        llm_client: LLMClient | None = None,
        prompt_service: PromptService | None = None,
        max_react_retries: int | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.prompt_service = prompt_service or PromptService()
        self.llm_client = llm_client or LLMClient(settings=self.settings, prompt_service=self.prompt_service)
        self.max_react_retries = max_react_retries if max_react_retries is not None else self.settings.max_react_retries

    def build_user_prompt(self, review_input: ReviewEngineInput) -> str:
        return self.prompt_service.build_review_prompt(
            system_prompt=review_input.system_prompt,
            source_data=review_input.source_data,
            label_data=review_input.label_data,
            dimensions=review_input.dimensions,
        )

    def build_messages(
        self,
        review_input: ReviewEngineInput,
        *,
        user_prompt: str | None = None,
    ) -> tuple[str, list[dict[str, str]]]:
        effective_user_prompt = user_prompt or self.build_user_prompt(review_input)
        messages: list[dict[str, str]] = [
            {"role": "system", "content": review_input.system_prompt},
            {"role": "user", "content": effective_user_prompt},
        ]
        if review_input.memory_context:
            memory_block = json.dumps(review_input.memory_context, ensure_ascii=False, indent=2)
            messages.append(
                {
                    "role": "user",
                    "content": (
                        "========== 历史相似案例参考（Memory） ==========\n"
                        f"{memory_block}\n\n"
                        "请参考以上历史处理经验，保持判定口径一致。"
                    ),
                }
            )
        return effective_user_prompt, messages

    def run(
        self,
        review_input: ReviewEngineInput,
        *,
        user_prompt: str | None = None,
    ) -> ReviewEngineResult:
        effective_user_prompt, messages = self.build_messages(review_input, user_prompt=user_prompt)
        dynamic_llm_model = create_dynamic_llm_result_model(review_input.dimensions)

        validated_result: dict[str, Any] | None = None
        raw_llm_output: dict[str, Any] | None = None
        last_error: str | None = None
        attempt_counter = 0
        llm_latency_ms = 0.0
        llm_client_request_id: str | None = None
        llm_completion_id: str | None = None
        prompt_tokens_total = 0
        completion_tokens_total = 0
        total_tokens_total = 0
        attempt_traces: list[LlmAttemptTrace] = []

        while attempt_counter < self.max_react_retries:
            attempt_counter += 1
            logger.info(
                "ReAct 自纠错循环 第 %s/%s 次",
                attempt_counter,
                self.max_react_retries,
            )
            try:
                llm_call = self.llm_client.call_with_full_messages(
                    messages=messages,
                    llm_runtime=review_input.llm_runtime,
                    temperature=review_input.temperature,
                    seed=review_input.stable_seed,
                )
                if isinstance(llm_call, LlmJsonCallResult):
                    raw_llm_output = llm_call.payload
                    llm_latency_ms += llm_call.latency_ms
                    llm_client_request_id = llm_call.client_request_id
                    llm_completion_id = llm_call.completion_id
                    if llm_call.prompt_tokens is not None:
                        prompt_tokens_total += llm_call.prompt_tokens
                    if llm_call.completion_tokens is not None:
                        completion_tokens_total += llm_call.completion_tokens
                    if llm_call.total_tokens is not None:
                        total_tokens_total += llm_call.total_tokens
                else:
                    raw_llm_output = llm_call
                validated = dynamic_llm_model.model_validate(raw_llm_output)
                validated_result = validated.model_dump()
                attempt_traces.append(
                    LlmAttemptTrace(
                        attempt_no=attempt_counter,
                        prompt_snapshot=json.dumps(messages, ensure_ascii=False),
                        response_snapshot=json.dumps(raw_llm_output, ensure_ascii=False) if raw_llm_output else None,
                        error_message=None,
                        success=True,
                        latency_ms=llm_call.latency_ms if isinstance(llm_call, LlmJsonCallResult) else None,
                        prompt_tokens=llm_call.prompt_tokens if isinstance(llm_call, LlmJsonCallResult) else None,
                        completion_tokens=llm_call.completion_tokens if isinstance(llm_call, LlmJsonCallResult) else None,
                        total_tokens=llm_call.total_tokens if isinstance(llm_call, LlmJsonCallResult) else None,
                        provider_request_id=llm_call.client_request_id if isinstance(llm_call, LlmJsonCallResult) else None,
                    )
                )
                logger.info("Pydantic 动态 Schema 校验成功，attempt=%s", attempt_counter)
                break

            except ValidationError as ve:
                last_error = str(ve)
                attempt_traces.append(
                    LlmAttemptTrace(
                        attempt_no=attempt_counter,
                        prompt_snapshot=json.dumps(messages, ensure_ascii=False),
                        response_snapshot=json.dumps(raw_llm_output, ensure_ascii=False) if raw_llm_output else None,
                        error_message=last_error,
                        success=False,
                        latency_ms=None,
                        prompt_tokens=None,
                        completion_tokens=None,
                        total_tokens=None,
                        provider_request_id=None,
                    )
                )
                validation_errors = [
                    f"字段路径: {'->'.join(str(part) for part in err['loc'])}, 问题: {err['msg']}"
                    for err in ve.errors()
                ]
                error_feedback_message = (
                    f"你上一次输出的内容不符合校验规范，具体错误详情共 {len(validation_errors)} 条:\n"
                    f"{json.dumps(validation_errors, ensure_ascii=False, indent=2)}\n"
                    "请完全自我修复，严格遵守 JSON Schema 定义重新输出正确的结果。"
                    "如果上一次仅是结构问题，请保持原有评分尺度，不要无故大幅调整分数。"
                )
                logger.warning("Schema 校验失败，反馈给大模型重试: %s", validation_errors)
                messages.append(
                    {
                        "role": "assistant",
                        "content": json.dumps(raw_llm_output, ensure_ascii=False) if raw_llm_output else "{}",
                    }
                )
                messages.append({"role": "user", "content": error_feedback_message})
                continue

            except (TimeoutError, FuturesTimeoutError, json.JSONDecodeError, Exception) as exc:
                last_error = str(exc)
                attempt_traces.append(
                    LlmAttemptTrace(
                        attempt_no=attempt_counter,
                        prompt_snapshot=json.dumps(messages, ensure_ascii=False),
                        response_snapshot=json.dumps(raw_llm_output, ensure_ascii=False) if raw_llm_output else None,
                        error_message=last_error,
                        success=False,
                        latency_ms=None,
                        prompt_tokens=None,
                        completion_tokens=None,
                        total_tokens=None,
                        provider_request_id=None,
                    )
                )
                error_feedback_message = f"处理你的输出时遇到异常: {exc}，请重新输出合法的 JSON 格式结果。"
                logger.exception("ReAct 尝试异常 attempt=%s", attempt_counter)
                if raw_llm_output is not None:
                    messages.append(
                        {"role": "assistant", "content": json.dumps(raw_llm_output, ensure_ascii=False)}
                    )
                messages.append({"role": "user", "content": error_feedback_message})
                continue

        if validated_result is None:
            return ReviewEngineResult(
                success=False,
                verdict="manual",
                reason=f"经过 {self.max_react_retries} 次 ReAct 自纠错循环后仍未通过校验",
                scores={},
                dimension_reasons={},
                raw_output=raw_llm_output,
                attempts=attempt_counter,
                system_prompt=review_input.system_prompt,
                user_prompt=effective_user_prompt,
                messages=messages,
                error=last_error,
                llm_latency_ms=llm_latency_ms or None,
                llm_client_request_id=llm_client_request_id,
                llm_completion_id=llm_completion_id,
                prompt_tokens=prompt_tokens_total or None,
                completion_tokens=completion_tokens_total or None,
                total_tokens=total_tokens_total or None,
                attempt_traces=attempt_traces,
            )

        scores_obj = validated_result["scores"]
        raw_scores = scores_obj.model_dump() if hasattr(scores_obj, "model_dump") else dict(scores_obj)
        dimension_reasons_obj = validated_result["dimensionReasons"]
        raw_dimension_reasons = (
            dimension_reasons_obj.model_dump()
            if hasattr(dimension_reasons_obj, "model_dump")
            else dict(dimension_reasons_obj)
        )
        verdict = validated_result["verdict"]
        verdict_value = verdict.value if hasattr(verdict, "value") else str(verdict)

        return ReviewEngineResult(
            success=True,
            verdict=verdict_value,
            reason=validated_result["reason"],
            scores=raw_scores,
            dimension_reasons=raw_dimension_reasons,
            raw_output=raw_llm_output,
            attempts=attempt_counter,
            system_prompt=review_input.system_prompt,
            user_prompt=effective_user_prompt,
            messages=messages,
            llm_latency_ms=llm_latency_ms or None,
            llm_client_request_id=llm_client_request_id,
            llm_completion_id=llm_completion_id,
            prompt_tokens=prompt_tokens_total or None,
            completion_tokens=completion_tokens_total or None,
            total_tokens=total_tokens_total or None,
            attempt_traces=attempt_traces,
        )
