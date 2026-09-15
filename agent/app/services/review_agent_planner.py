"""LLM planner for the bounded review-agent loop."""
from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError

from app.core.llm_runtime import resolve_llm_runtime
from app.schemas.agent_orchestration import ReviewAgentAction
from app.schemas.ai_review import AiReviewRequest
from app.services.llm_client import LLMClient


PLANNER_SYSTEM_PROMPT = """你是 LabelHub 审核 Agent 的受限 Planner。
你的职责不是直接给出审核结论，而是从白名单动作中选择下一步：
- inspect_rules：查看本任务评分维度、阈值与输出约束；
- inspect_history：查看已提供的历史审核上下文；
- final_review：结束规划并进入正式 AI 审核。

规则：
1. 只能选择上述三个动作；
2. 不允许修改业务状态、提交内容或评分规则；
3. 已经获取过的信息不要重复调用；
4. 信息足够时立即选择 final_review；
5. 输出严格 JSON：{"tool":"...","arguments":{},"reason":"..."}。
"""


class ReviewAgentPlanner:
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self.llm_client = llm_client or LLMClient()

    def decide(
        self,
        request: AiReviewRequest,
        *,
        steps: list[dict[str, Any]],
    ) -> ReviewAgentAction:
        runtime = resolve_llm_runtime(
            platform_key=request.platform_key,
            model_id=request.model_id,
            llm_base_url=request.llm_base_url,
            llm_api_key=request.llm_api_key,
        )
        planner_input = {
            "submissionId": request.submission_id,
            "taskId": request.task_id,
            "dimensionCount": len(request.dimensions or []),
            "memoryContextCount": len(request.memory_context or []),
            "hasCustomPrompt": bool((request.prompt_template or "").strip()),
            "completedSteps": steps,
        }
        call = self.llm_client.call_with_full_messages(
            messages=[
                {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(planner_input, ensure_ascii=False)},
            ],
            llm_runtime=runtime,
            temperature=0.0,
            seed=((int(request.submission_id) * 17) ^ int(request.submission_version_id)) & 0x7FFFFFFF,
        )
        try:
            return ReviewAgentAction.model_validate(call.payload)
        except ValidationError as exc:
            raise ValueError(f"invalid planner action: {exc}") from exc
