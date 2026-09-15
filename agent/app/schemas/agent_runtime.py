"""Contracts for the bounded tool-using review agent runtime."""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AgentActionType(str, Enum):
    CALL_TOOL = "CALL_TOOL"
    FINALIZE = "FINALIZE"


class AgentAction(BaseModel):
    """One planner decision.

    The model is intentionally not asked to emit chain-of-thought.  The action
    contract only contains the operational decision needed by the runtime.
    """

    model_config = ConfigDict(extra="forbid")

    action: AgentActionType
    tool: str | None = None
    arguments: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_action(self) -> "AgentAction":
        if self.action == AgentActionType.CALL_TOOL and not (self.tool or "").strip():
            raise ValueError("tool is required when action=CALL_TOOL")
        if self.action == AgentActionType.FINALIZE and self.tool is not None:
            raise ValueError("tool must be omitted when action=FINALIZE")
        return self


class AgentStepStatus(str, Enum):
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"


class AgentStepTrace(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    step_no: int = Field(ge=1, alias="stepNo")
    action: AgentActionType
    tool: str | None = None
    arguments: dict[str, Any] = Field(default_factory=dict)
    status: AgentStepStatus
    result_preview: str | None = Field(default=None, alias="resultPreview")
    error_message: str | None = Field(default=None, alias="errorMessage")
    latency_ms: float | None = Field(default=None, ge=0, alias="latencyMs")


class AgentTermination(str, Enum):
    MODEL_FINALIZE = "MODEL_FINALIZE"
    MAX_STEPS = "MAX_STEPS"
    PLANNER_FAILURE = "PLANNER_FAILURE"
    DISABLED = "DISABLED"


class AgentRunResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    termination: AgentTermination
    steps: list[AgentStepTrace] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    planner_calls: int = Field(default=0, ge=0, alias="plannerCalls")
    tool_calls: int = Field(default=0, ge=0, alias="toolCalls")
    llm_latency_ms: float = Field(default=0.0, ge=0, alias="llmLatencyMs")
    prompt_tokens: int = Field(default=0, ge=0, alias="promptTokens")
    completion_tokens: int = Field(default=0, ge=0, alias="completionTokens")
    total_tokens: int = Field(default=0, ge=0, alias="totalTokens")


class RequiredFieldsArgs(BaseModel):
    fields: list[str] = Field(min_length=1, max_length=100)


class ComparePair(BaseModel):
    source_path: str = Field(alias="sourcePath", min_length=1, max_length=200)
    label_path: str = Field(alias="labelPath", min_length=1, max_length=200)
    normalize_text: bool = Field(default=True, alias="normalizeText")


class CompareFieldsArgs(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    pairs: list[ComparePair] = Field(min_length=1, max_length=50)


class SearchMemoryArgs(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=3, ge=1, le=10)


class ToolName(str, Enum):
    CHECK_REQUIRED_FIELDS = "check_required_fields"
    COMPARE_FIELDS = "compare_fields"
    SEARCH_REVIEW_MEMORY = "search_review_memory"
