"""AI 预审 API 契约（对齐 backend/docs/contracts/pyagent-ai-review.openapi.yaml）。"""
from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AiReviewVerdict(str, Enum):
    PASS = "PASS"
    REJECT = "REJECT"
    REQUIRE_HUMAN = "REQUIRE_HUMAN"


class AiReviewDimensionSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    dimension_key: str = Field(alias="dimensionKey")
    dimension_name: str = Field(alias="dimensionName")
    weight: float | None = None
    score_min: float | None = Field(default=None, alias="scoreMin")
    score_max: float | None = Field(default=None, alias="scoreMax")
    pass_threshold: float | None = Field(default=None, alias="passThreshold")
    reject_threshold: float | None = Field(default=None, alias="rejectThreshold")
    prompt_instruction: str | None = Field(default=None, alias="promptInstruction")
    anchor_score: float | None = Field(default=None, alias="anchorScore")
    anchor_tolerance: float | None = Field(default=None, alias="anchorTolerance")


class AiReviewRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    submission_id: int = Field(alias="submissionId")
    submission_version_id: int = Field(alias="submissionVersionId")
    task_id: int = Field(alias="taskId")
    platform_key: str | None = Field(default=None, alias="platformKey")
    model_id: str | None = Field(default=None, alias="modelId")
    prompt_template: str | None = Field(default=None, alias="promptTemplate")
    output_schema_json: str | None = Field(default=None, alias="outputSchemaJson")
    submit_data: dict[str, Any] = Field(default_factory=dict, alias="submitData")
    item_payload: dict[str, Any] = Field(default_factory=dict, alias="itemPayload")
    dimensions: list[AiReviewDimensionSpec] = Field(default_factory=list)
    memory_context: list[dict[str, Any]] = Field(default_factory=list, alias="memoryContext")
    llm_base_url: str | None = Field(default=None, alias="llmBaseUrl")
    llm_api_key: str | None = Field(default=None, alias="llmApiKey")


class AiReviewLlmAttemptResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    attempt_no: int = Field(alias="attemptNo")
    platform_key: str | None = Field(default=None, alias="platformKey")
    model_id: str | None = Field(default=None, alias="modelId")
    provider_request_id: str | None = Field(default=None, alias="providerRequestId")
    prompt_snapshot: str | None = Field(default=None, alias="promptSnapshot")
    response_snapshot: str | None = Field(default=None, alias="responseSnapshot")
    error_message: str | None = Field(default=None, alias="errorMessage")
    success: bool = Field(default=False, alias="success")
    latency_ms: int | None = Field(default=None, alias="latencyMs")
    prompt_tokens: int | None = Field(default=None, alias="promptTokens")
    completion_tokens: int | None = Field(default=None, alias="completionTokens")
    total_tokens: int | None = Field(default=None, alias="totalTokens")
    traceability_status: str | None = Field(default="FULL", alias="traceabilityStatus")
    history_gap_reason: str | None = Field(default=None, alias="historyGapReason")


class AiReviewDimensionResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    dimension_key: str = Field(alias="dimensionKey")
    dimension_name: str = Field(alias="dimensionName")
    score: float = Field(alias="score")
    weight: float | None = Field(default=None, alias="weight")
    verdict: AiReviewVerdict | None = Field(default=None, alias="verdict")
    comment: str | None = Field(default=None, alias="comment")


class AiReviewResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    platform_key: str = Field(alias="platformKey")
    model_id: str = Field(alias="modelId")
    verdict: AiReviewVerdict = Field(alias="verdict")
    total_score: float = Field(alias="totalScore")
    summary: str = Field(alias="summary")
    prompt_snapshot: str | None = Field(default=None, alias="promptSnapshot")
    input_snapshot: dict[str, Any] | None = Field(default=None, alias="inputSnapshot")
    parsed_result: dict[str, Any] | None = Field(default=None, alias="parsedResult")
    raw_response_text: str | None = Field(default=None, alias="rawResponseText")
    provider_request_id: str | None = Field(default=None, alias="providerRequestId")
    dimensions: list[AiReviewDimensionResult] = Field(default_factory=list, alias="dimensions")
    total_latency_ms: int | None = Field(default=None, alias="totalLatencyMs")
    attempt_count: int | None = Field(default=None, alias="attemptCount")
    prompt_tokens: int | None = Field(default=None, alias="promptTokens")
    completion_tokens: int | None = Field(default=None, alias="completionTokens")
    total_tokens: int | None = Field(default=None, alias="totalTokens")
    llm_attempts: list[AiReviewLlmAttemptResult] = Field(default_factory=list, alias="llmAttempts")
