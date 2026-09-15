"""Context-governed facade for the existing AI review service."""
from __future__ import annotations

import os

from app.observability.runtime_trace import runtime_trace_recorder
from app.schemas.ai_review import AiReviewRequest, AiReviewResult
from app.schemas.context_management import ContextSelectionPolicy
from app.schemas.trace import TraceEventStatus
from app.services.ai_review_service import AiReviewService
from app.services.context_manager import ContextManager


def _positive_int(value: str | None, default: int) -> int:
    if not value:
        return default
    try:
        parsed = int(value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def context_policy_from_env() -> ContextSelectionPolicy:
    return ContextSelectionPolicy(
        maxItems=_positive_int(os.getenv("LABELHUB_CONTEXT_MAX_ITEMS"), 12),
        maxChars=_positive_int(os.getenv("LABELHUB_CONTEXT_MAX_CHARS"), 12000),
    )


class ManagedAiReviewService:
    """Apply deterministic context governance before delegating to AiReviewService."""

    def __init__(
        self,
        *,
        delegate: AiReviewService | None = None,
        context_manager: ContextManager | None = None,
        context_policy: ContextSelectionPolicy | None = None,
    ) -> None:
        self.delegate = delegate or AiReviewService()
        self.context_manager = context_manager or ContextManager()
        self.context_policy = context_policy or context_policy_from_env()

    def execute(self, request: AiReviewRequest) -> AiReviewResult:
        managed = self.context_manager.select(
            request.memory_context or [],
            policy=self.context_policy,
        )
        stats = managed.stats.model_dump(by_alias=True)
        runtime_trace_recorder.record_event(
            component="context",
            operation="select_review_context",
            status=TraceEventStatus.SUCCESS,
            attributes=stats,
        )

        managed_request = request.model_copy(update={"memory_context": managed.items})
        result = self.delegate.execute(managed_request)

        parsed_result = dict(result.parsed_result or {})
        parsed_result["contextSelection"] = stats
        return result.model_copy(update={"parsed_result": parsed_result})
