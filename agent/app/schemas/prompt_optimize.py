"""Prompt Optimizer API 契约（对齐设计 spec §5.2）。"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PromptOptimizeDimensionSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    key: str
    name: str
    prompt_instruction: str = Field(alias="promptInstruction")
    anchor_score: float | None = Field(default=None, alias="anchorScore")
    anchor_tolerance: float | None = Field(default=None, alias="anchorTolerance")


class PromptOptimizeMisalignmentCase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    misalignment_type: str = Field(alias="misalignmentType")
    ai_verdict: str = Field(alias="aiVerdict")
    human_label: str = Field(alias="humanLabel")
    item_payload: dict[str, Any] = Field(default_factory=dict, alias="itemPayload")
    submit_data: dict[str, Any] = Field(default_factory=dict, alias="submitData")
    ai_summary: str | None = Field(default=None, alias="aiSummary")
    human_comment: str | None = Field(default=None, alias="humanComment")


class PromptOptimizeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    baseline_prompt_template: str = Field(alias="baselinePromptTemplate")
    platform_key: str | None = Field(default=None, alias="platformKey")
    model_id: str | None = Field(default=None, alias="modelId")
    llm_base_url: str | None = Field(default=None, alias="llmBaseUrl")
    llm_api_key: str | None = Field(default=None, alias="llmApiKey")
    dimensions: list[PromptOptimizeDimensionSpec] = Field(default_factory=list)
    misalignment_cases: list[PromptOptimizeMisalignmentCase] = Field(default_factory=list, alias="misalignmentCases")
    optimization_goals: list[str] = Field(default_factory=list, alias="optimizationGoals")


class PromptDiffHint(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    section: str
    change: str


class PromptOptimizeResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    candidate_prompt_template: str = Field(alias="candidatePromptTemplate")
    change_summary: str = Field(alias="changeSummary")
    targeted_misalignment_types: list[str] = Field(default_factory=list, alias="targetedMisalignmentTypes")
    risk_notes: str = Field(alias="riskNotes")
    prompt_diff_hints: list[PromptDiffHint] = Field(default_factory=list, alias="promptDiffHints")
