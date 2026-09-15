"""Read-only tools exposed to the review agent planner."""
from __future__ import annotations

from collections import Counter
from typing import Any

from app.schemas.agent_orchestration import ReviewAgentToolName
from app.schemas.ai_review import AiReviewRequest


class ReviewAgentToolbox:
    """Small, deterministic, read-only tool registry for review orchestration.

    Business-state mutation is intentionally excluded.  The only terminal action,
    ``final_review``, is handled by the orchestration service and delegates to the
    existing review service.
    """

    def execute(
        self,
        tool: ReviewAgentToolName,
        request: AiReviewRequest,
        arguments: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if tool == ReviewAgentToolName.INSPECT_RULES:
            return self.inspect_rules(request)
        if tool == ReviewAgentToolName.INSPECT_HISTORY:
            return self.inspect_history(request, arguments or {})
        raise ValueError(f"tool {tool.value} is terminal or unsupported by toolbox")

    @staticmethod
    def inspect_rules(request: AiReviewRequest) -> dict[str, Any]:
        dimensions = []
        for spec in request.dimensions or []:
            dimensions.append(
                {
                    "dimensionKey": spec.dimension_key,
                    "dimensionName": spec.dimension_name,
                    "weight": spec.weight,
                    "scoreMin": spec.score_min,
                    "scoreMax": spec.score_max,
                    "passThreshold": spec.pass_threshold,
                    "rejectThreshold": spec.reject_threshold,
                }
            )
        return {
            "dimensionCount": len(dimensions),
            "dimensions": dimensions,
            "hasCustomPrompt": bool((request.prompt_template or "").strip()),
            "outputSchemaConfigured": bool((request.output_schema_json or "").strip()),
        }

    @staticmethod
    def inspect_history(request: AiReviewRequest, arguments: dict[str, Any]) -> dict[str, Any]:
        raw_items = list(request.memory_context or [])
        requested_limit = arguments.get("limit", 5)
        try:
            limit = max(1, min(int(requested_limit), 10))
        except (TypeError, ValueError):
            limit = 5

        type_counter: Counter[str] = Counter()
        selected: list[dict[str, Any]] = []
        for item in raw_items:
            context_type = str(
                item.get("type")
                or item.get("contextType")
                or item.get("kind")
                or "unknown"
            )
            type_counter[context_type] += 1
            if len(selected) < limit:
                selected.append(item)

        return {
            "availableCount": len(raw_items),
            "selectedCount": len(selected),
            "typeCounts": dict(type_counter),
            "items": selected,
        }
