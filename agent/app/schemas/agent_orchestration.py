"""Contracts for the bounded review-agent orchestration loop."""
from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ReviewAgentToolName(str, Enum):
    INSPECT_RULES = "inspect_rules"
    INSPECT_HISTORY = "inspect_history"
    FINAL_REVIEW = "final_review"


class ReviewAgentAction(BaseModel):
    """One planner decision in the bounded agent loop."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    tool: ReviewAgentToolName
    arguments: dict[str, Any] = Field(default_factory=dict)
    reason: str = Field(min_length=1, max_length=1000)


class ReviewAgentStep(BaseModel):
    """Auditable execution record for one planner/tool step."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    step_no: int = Field(alias="stepNo", ge=1)
    tool: ReviewAgentToolName
    reason: str
    status: str
    observation: dict[str, Any] = Field(default_factory=dict)
