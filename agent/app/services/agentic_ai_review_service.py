"""Agentic facade over the existing structured AI review service."""
from __future__ import annotations

import logging

from app.core.config import Settings, get_settings
from app.core.llm_runtime import resolve_llm_runtime
from app.observability.runtime_trace import runtime_trace_recorder
from app.schemas.ai_review import AiReviewRequest, AiReviewResult
from app.schemas.agent_runtime import AgentRunResult, AgentTermination
from app.schemas.trace import TraceEventStatus
from app.services.ai_review_service import AiReviewService, DEFAULT_SYSTEM_PROMPT
from app.services.review_agent_runtime import ReviewAgentRuntime
from app.services.review_engine import ReviewEngineInput

logger = logging.getLogger(__name__)


class AgenticAiReviewService(AiReviewService):
    """Collect bounded tool evidence, then reuse the existing ReviewEngine.

    The planner cannot produce the persisted final verdict directly.  Its output
    is evidence only; the existing schema-constrained review path remains the
    authoritative final model contract.
    """

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        agent_runtime: ReviewAgentRuntime | None = None,
        **kwargs,
    ) -> None:
        super().__init__(**kwargs)
        self.settings = settings or get_settings()
        self.agent_runtime = agent_runtime or ReviewAgentRuntime(
            max_steps=self.settings.ai_review_agent_max_steps,
            max_tool_result_chars=self.settings.ai_review_agent_tool_result_max_chars,
        )

    @staticmethod
    def _sum_optional(base: int | None, extra: int) -> int | None:
        if base is None and extra == 0:
            return None
        return (base or 0) + extra

    def _planner_input(self, request: AiReviewRequest) -> tuple[ReviewEngineInput, str]:
        dimension_specs = self._normalize_dimension_specs(request.dimensions)
        llm_dimension_names = [self._llm_dimension_name(spec) for spec in dimension_specs]
        llm_runtime = resolve_llm_runtime(
            platform_key=request.platform_key,
            model_id=request.model_id,
            llm_base_url=request.llm_base_url,
            llm_api_key=request.llm_api_key,
        )
        stable_seed = ((int(request.submission_id) * 31) ^ int(request.submission_version_id)) & 0x7FFFFFFF
        planner_input = ReviewEngineInput(
            system_prompt=(request.prompt_template or DEFAULT_SYSTEM_PROMPT).strip(),
            source_data=request.item_payload or {},
            label_data=request.submit_data or {},
            dimensions=llm_dimension_names,
            memory_context=request.memory_context or [],
            llm_runtime=llm_runtime,
            stable_seed=stable_seed,
            temperature=0.0,
        )
        user_prompt = self.prompt_service.build_review_prompt_from_specs(
            system_prompt=planner_input.system_prompt,
            source_data=planner_input.source_data,
            label_data=planner_input.label_data,
            dimension_specs=[spec.model_dump(by_alias=True) for spec in dimension_specs],
        )
        return planner_input, user_prompt

    def _attach_agent_metadata(
        self,
        result: AiReviewResult,
        agent_result: AgentRunResult,
    ) -> AiReviewResult:
        parsed = dict(result.parsed_result or {})
        parsed["agentRuntime"] = {
            "enabled": True,
            "termination": agent_result.termination.value,
            "plannerCalls": agent_result.planner_calls,
            "toolCalls": agent_result.tool_calls,
            "evidenceCount": len(agent_result.evidence),
            "steps": [step.model_dump(by_alias=True, mode="json") for step in agent_result.steps],
        }
        total_latency = int(round((result.total_latency_ms or 0) + agent_result.llm_latency_ms))
        return result.model_copy(
            update={
                "parsed_result": parsed,
                "total_latency_ms": total_latency,
                "prompt_tokens": self._sum_optional(result.prompt_tokens, agent_result.prompt_tokens),
                "completion_tokens": self._sum_optional(
                    result.completion_tokens, agent_result.completion_tokens
                ),
                "total_tokens": self._sum_optional(result.total_tokens, agent_result.total_tokens),
            }
        )

    def execute(self, request: AiReviewRequest) -> AiReviewResult:
        if not self.settings.ai_review_agent_enabled:
            result = super().execute(request)
            parsed = dict(result.parsed_result or {})
            parsed["agentRuntime"] = {
                "enabled": False,
                "termination": AgentTermination.DISABLED.value,
            }
            return result.model_copy(update={"parsed_result": parsed})

        try:
            planner_input, user_prompt = self._planner_input(request)
            agent_result = self.agent_runtime.run(
                review_input=planner_input,
                user_prompt=user_prompt,
            )
        except Exception as exc:
            logger.exception("bounded review agent failed; falling back to structured review")
            runtime_trace_recorder.record_event(
                component="review_agent",
                operation="agent_fallback",
                status=TraceEventStatus.ERROR,
                attributes={"submissionId": request.submission_id},
                error=exc,
            )
            result = super().execute(request)
            parsed = dict(result.parsed_result or {})
            parsed["agentRuntime"] = {
                "enabled": True,
                "termination": AgentTermination.PLANNER_FAILURE.value,
                "fallback": True,
                "errorType": type(exc).__name__,
            }
            return result.model_copy(update={"parsed_result": parsed})

        augmented_request = request.model_copy(
            update={"memory_context": [*(request.memory_context or []), *agent_result.evidence]}
        )
        result = super().execute(augmented_request)
        return self._attach_agent_metadata(result, agent_result)
