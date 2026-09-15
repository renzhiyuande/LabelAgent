"""Bounded tool-using orchestration for LabelHub AI review."""
from __future__ import annotations

import os
from typing import Any

from app.observability.runtime_trace import runtime_trace_recorder
from app.schemas.agent_orchestration import ReviewAgentAction, ReviewAgentStep, ReviewAgentToolName
from app.schemas.ai_review import AiReviewRequest, AiReviewResult
from app.schemas.trace import TraceEventStatus
from app.services.managed_ai_review_service import ManagedAiReviewService
from app.services.review_agent_planner import ReviewAgentPlanner
from app.services.review_agent_tools import ReviewAgentToolbox


def _max_steps_from_env() -> int:
    raw = os.getenv("LABELHUB_AGENT_MAX_STEPS", "4")
    try:
        value = int(raw)
    except ValueError:
        return 4
    return max(1, min(value, 8))


class ReviewAgentService:
    """Run a bounded planner/tool loop before the authoritative review engine.

    The planner can inspect read-only information but cannot mutate workflow state.
    ``final_review`` delegates to the existing managed review service, preserving the
    current scoring, schema validation, calibration, consensus and context controls.
    """

    def __init__(
        self,
        *,
        planner: ReviewAgentPlanner | None = None,
        toolbox: ReviewAgentToolbox | None = None,
        final_review_service: ManagedAiReviewService | None = None,
        max_steps: int | None = None,
    ) -> None:
        self.planner = planner or ReviewAgentPlanner()
        self.toolbox = toolbox or ReviewAgentToolbox()
        self.final_review_service = final_review_service or ManagedAiReviewService()
        self.max_steps = max_steps or _max_steps_from_env()

    @staticmethod
    def _observation_summary(tool: ReviewAgentToolName, observation: dict[str, Any]) -> dict[str, Any]:
        if tool == ReviewAgentToolName.INSPECT_RULES:
            return {
                "dimensionCount": observation.get("dimensionCount", 0),
                "hasCustomPrompt": observation.get("hasCustomPrompt", False),
                "outputSchemaConfigured": observation.get("outputSchemaConfigured", False),
            }
        if tool == ReviewAgentToolName.INSPECT_HISTORY:
            return {
                "availableCount": observation.get("availableCount", 0),
                "selectedCount": observation.get("selectedCount", 0),
                "typeCounts": observation.get("typeCounts", {}),
            }
        return {}

    def _attach_agent_run(
        self,
        result: AiReviewResult,
        *,
        steps: list[ReviewAgentStep],
        fallback_reason: str | None,
    ) -> AiReviewResult:
        parsed = dict(result.parsed_result or {})
        parsed["agentRun"] = {
            "mode": "bounded_tool_loop",
            "maxSteps": self.max_steps,
            "executedSteps": len(steps),
            "fallbackReason": fallback_reason,
            "steps": [step.model_dump(by_alias=True) for step in steps],
        }
        return result.model_copy(update={"parsed_result": parsed})

    def execute(self, request: AiReviewRequest) -> AiReviewResult:
        planner_state: list[dict[str, Any]] = []
        audit_steps: list[ReviewAgentStep] = []
        used_read_tools: set[ReviewAgentToolName] = set()
        fallback_reason: str | None = None

        for step_no in range(1, self.max_steps + 1):
            try:
                action = self.planner.decide(request, steps=planner_state)
            except Exception as exc:
                fallback_reason = f"planner_error:{type(exc).__name__}"
                runtime_trace_recorder.record_event(
                    component="agent",
                    operation="planner_decide",
                    status=TraceEventStatus.ERROR,
                    attributes={"stepNo": step_no},
                    error=exc,
                )
                break

            runtime_trace_recorder.record_event(
                component="agent",
                operation="planner_decide",
                status=TraceEventStatus.SUCCESS,
                attributes={"stepNo": step_no, "tool": action.tool.value},
            )

            if action.tool == ReviewAgentToolName.FINAL_REVIEW:
                audit_steps.append(
                    ReviewAgentStep(
                        stepNo=step_no,
                        tool=action.tool,
                        reason=action.reason,
                        status="terminal",
                        observation={},
                    )
                )
                result = self.final_review_service.execute(request)
                return self._attach_agent_run(
                    result,
                    steps=audit_steps,
                    fallback_reason=fallback_reason,
                )

            if action.tool in used_read_tools:
                fallback_reason = f"duplicate_tool:{action.tool.value}"
                break

            try:
                observation = self.toolbox.execute(action.tool, request, action.arguments)
            except Exception as exc:
                fallback_reason = f"tool_error:{action.tool.value}:{type(exc).__name__}"
                runtime_trace_recorder.record_event(
                    component="agent_tool",
                    operation=action.tool.value,
                    status=TraceEventStatus.ERROR,
                    attributes={"stepNo": step_no},
                    error=exc,
                )
                break

            used_read_tools.add(action.tool)
            summary = self._observation_summary(action.tool, observation)
            audit_steps.append(
                ReviewAgentStep(
                    stepNo=step_no,
                    tool=action.tool,
                    reason=action.reason,
                    status="success",
                    observation=summary,
                )
            )
            planner_state.append(
                {
                    "stepNo": step_no,
                    "tool": action.tool.value,
                    "reason": action.reason,
                    "observation": observation,
                }
            )
            runtime_trace_recorder.record_event(
                component="agent_tool",
                operation=action.tool.value,
                status=TraceEventStatus.SUCCESS,
                attributes={"stepNo": step_no, **summary},
            )

        if fallback_reason is None:
            fallback_reason = "max_steps_reached"
        forced_step = len(audit_steps) + 1
        audit_steps.append(
            ReviewAgentStep(
                stepNo=forced_step,
                tool=ReviewAgentToolName.FINAL_REVIEW,
                reason="安全降级：规划循环结束，进入现有正式审核引擎。",
                status="forced_terminal",
                observation={},
            )
        )
        runtime_trace_recorder.record_event(
            component="agent",
            operation="forced_final_review",
            status=TraceEventStatus.SUCCESS,
            attributes={"reason": fallback_reason, "stepNo": forced_step},
        )
        result = self.final_review_service.execute(request)
        return self._attach_agent_run(result, steps=audit_steps, fallback_reason=fallback_reason)
