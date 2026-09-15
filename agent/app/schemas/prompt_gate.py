"""Contracts for deterministic Prompt candidate promotion gating."""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class PromotionDecision(str, Enum):
    PROMOTE = "PROMOTE"
    REJECT = "REJECT"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class PromptPromotionPolicy(BaseModel):
    """Configurable quality thresholds used before a candidate can be promoted.

    The gate only evaluates eligibility.  It never writes the production Prompt.
    """

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    min_sample_count: int = Field(default=200, ge=1, alias="minSampleCount")
    min_candidate_agreement_rate: float | None = Field(
        default=None, ge=0.0, le=1.0, alias="minCandidateAgreementRate"
    )
    min_agreement_delta: float = Field(default=0.0, ge=-1.0, le=1.0, alias="minAgreementDelta")
    min_bad_case_fix_rate: float | None = Field(
        default=None, ge=0.0, le=1.0, alias="minBadCaseFixRate"
    )
    max_regression_rate: float = Field(default=0.05, ge=0.0, le=1.0, alias="maxRegressionRate")
    max_score_mae_delta: float | None = Field(default=0.0, alias="maxScoreMaeDelta")


class PromotionCheck(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    name: str
    passed: bool
    actual: float | int | None = None
    operator: str
    threshold: float | int | None = None
    note: str | None = None


class PromptPromotionResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    baseline_version: str = Field(alias="baselineVersion")
    candidate_version: str = Field(alias="candidateVersion")
    decision: PromotionDecision
    eligible_for_promotion: bool = Field(alias="eligibleForPromotion")
    checks: list[PromotionCheck] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
