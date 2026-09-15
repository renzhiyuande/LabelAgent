"""Offline evaluation contracts for AI review replay experiments."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.ai_review import AiReviewVerdict


class EvaluationSample(BaseModel):
    """One human-reviewed sample and the corresponding AI execution outcome."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    sample_id: str = Field(alias="sampleId")
    human_verdict: AiReviewVerdict = Field(alias="humanVerdict")
    ai_verdict: AiReviewVerdict = Field(alias="aiVerdict")
    human_score: float | None = Field(default=None, alias="humanScore")
    ai_score: float | None = Field(default=None, alias="aiScore")
    structured_output_success: bool = Field(default=True, alias="structuredOutputSuccess")
    retry_count: int = Field(default=0, ge=0, alias="retryCount")
    recovered_by_retry: bool = Field(default=False, alias="recoveredByRetry")
    latency_ms: int | None = Field(default=None, ge=0, alias="latencyMs")
    total_tokens: int | None = Field(default=None, ge=0, alias="totalTokens")
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_retry_recovery(self) -> "EvaluationSample":
        if self.recovered_by_retry and self.retry_count == 0:
            raise ValueError("recoveredByRetry requires retryCount > 0")
        return self


class EvaluationDataset(BaseModel):
    """Versioned offline dataset used to evaluate one review configuration."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    name: str
    version: str | None = None
    samples: list[EvaluationSample] = Field(default_factory=list)


class EvaluationMetrics(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    sample_count: int = Field(alias="sampleCount")
    agreement_count: int = Field(alias="agreementCount")
    agreement_rate: float = Field(alias="agreementRate")
    confusion_matrix: dict[str, dict[str, int]] = Field(alias="confusionMatrix")
    score_mae: float | None = Field(default=None, alias="scoreMae")
    structured_output_success_rate: float = Field(alias="structuredOutputSuccessRate")
    retry_case_count: int = Field(alias="retryCaseCount")
    retry_recovered_count: int = Field(alias="retryRecoveredCount")
    retry_recovery_rate: float | None = Field(default=None, alias="retryRecoveryRate")
    avg_latency_ms: float | None = Field(default=None, alias="avgLatencyMs")
    p95_latency_ms: float | None = Field(default=None, alias="p95LatencyMs")
    avg_total_tokens: float | None = Field(default=None, alias="avgTotalTokens")


class ReplayComparisonSample(BaseModel):
    """Paired baseline/candidate outputs for the same human-reviewed sample."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    sample_id: str = Field(alias="sampleId")
    human_verdict: AiReviewVerdict = Field(alias="humanVerdict")
    baseline_verdict: AiReviewVerdict = Field(alias="baselineVerdict")
    candidate_verdict: AiReviewVerdict = Field(alias="candidateVerdict")
    human_score: float | None = Field(default=None, alias="humanScore")
    baseline_score: float | None = Field(default=None, alias="baselineScore")
    candidate_score: float | None = Field(default=None, alias="candidateScore")
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReplayComparisonRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    baseline_version: str = Field(alias="baselineVersion")
    candidate_version: str = Field(alias="candidateVersion")
    samples: list[ReplayComparisonSample] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_versions(self) -> "ReplayComparisonRequest":
        if self.baseline_version == self.candidate_version:
            raise ValueError("baselineVersion and candidateVersion must differ")
        return self


class ReplayComparisonMetrics(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    sample_count: int = Field(alias="sampleCount")
    baseline_agreement_rate: float = Field(alias="baselineAgreementRate")
    candidate_agreement_rate: float = Field(alias="candidateAgreementRate")
    agreement_delta: float = Field(alias="agreementDelta")
    baseline_bad_case_count: int = Field(alias="baselineBadCaseCount")
    bad_case_fixed_count: int = Field(alias="badCaseFixedCount")
    bad_case_fix_rate: float | None = Field(default=None, alias="badCaseFixRate")
    baseline_correct_count: int = Field(alias="baselineCorrectCount")
    regression_count: int = Field(alias="regressionCount")
    regression_rate: float | None = Field(default=None, alias="regressionRate")
    baseline_score_mae: float | None = Field(default=None, alias="baselineScoreMae")
    candidate_score_mae: float | None = Field(default=None, alias="candidateScoreMae")
    score_mae_delta: float | None = Field(default=None, alias="scoreMaeDelta")
