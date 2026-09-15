"""Contracts for deterministic review-context selection."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


DEFAULT_CONTEXT_TYPE_PRIORITIES = {
    "project_rule": 100,
    "reviewer_feedback": 90,
    "bad_case": 80,
    "review_history": 60,
    "generic": 50,
}


class ContextSelectionPolicy(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    max_items: int = Field(default=12, ge=1, alias="maxItems")
    max_chars: int = Field(default=12000, ge=1, alias="maxChars")
    default_priority: int = Field(default=50, alias="defaultPriority")
    type_priorities: dict[str, int] = Field(
        default_factory=lambda: dict(DEFAULT_CONTEXT_TYPE_PRIORITIES),
        alias="typePriorities",
    )
    per_type_limits: dict[str, int] = Field(default_factory=dict, alias="perTypeLimits")


class ContextSelectionStats(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    input_count: int = Field(alias="inputCount")
    selected_count: int = Field(alias="selectedCount")
    dropped_count: int = Field(alias="droppedCount")
    deduplicated_count: int = Field(alias="deduplicatedCount")
    item_limit_rejected_count: int = Field(alias="itemLimitRejectedCount")
    char_budget_rejected_count: int = Field(alias="charBudgetRejectedCount")
    type_limit_rejected_count: int = Field(alias="typeLimitRejectedCount")
    selected_chars: int = Field(alias="selectedChars")


class ManagedContextResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    items: list[dict[str, Any]] = Field(default_factory=list)
    stats: ContextSelectionStats
