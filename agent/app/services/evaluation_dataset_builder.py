"""Build offline evaluation samples from persisted AI-review outcomes.

The builder intentionally stays deterministic and side-effect free.  It does not
query databases or call models; callers are responsible for loading the AI result
and the human final decision from their source of truth.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.schemas.ai_review import AiReviewResult, AiReviewVerdict
from app.schemas.evaluation import EvaluationDataset, EvaluationSample


@dataclass(frozen=True, slots=True)
class HumanReviewGroundTruth:
    """Reviewer final decision used as the offline-evaluation ground truth."""

    verdict: AiReviewVerdict
    score: float | None = None
    reviewer_id: str | None = None
    comment: str | None = None


class EvaluationDatasetBuilder:
    """Convert online review traces into stable offline-evaluation records."""

    @staticmethod
    def _failed_attempt_count(result: AiReviewResult) -> int:
        return sum(not attempt.success for attempt in (result.llm_attempts or []))

    @classmethod
    def from_review_result(
        cls,
        *,
        sample_id: str,
        ai_result: AiReviewResult,
        human: HumanReviewGroundTruth,
        metadata: dict[str, Any] | None = None,
    ) -> EvaluationSample:
        """Build one successful execution sample.

        ``retry_count`` counts failed LLM attempts instead of deriving it from
        ``attempt_count``.  The latter may include successful repeated inference
        used for score consensus, which must not be mislabeled as retries.
        """

        failed_attempts = cls._failed_attempt_count(ai_result)
        recovered_by_retry = failed_attempts > 0 and any(
            attempt.success for attempt in (ai_result.llm_attempts or [])
        )
        merged_metadata = {
            "platformKey": ai_result.platform_key,
            "modelId": ai_result.model_id,
            "providerRequestId": ai_result.provider_request_id,
            **(metadata or {}),
        }
        if human.reviewer_id is not None:
            merged_metadata["reviewerId"] = human.reviewer_id
        if human.comment is not None:
            merged_metadata["humanComment"] = human.comment

        return EvaluationSample(
            sample_id=sample_id,
            human_verdict=human.verdict,
            ai_verdict=ai_result.verdict,
            human_score=human.score,
            ai_score=ai_result.total_score,
            structured_output_success=ai_result.parsed_result is not None,
            retry_count=failed_attempts,
            recovered_by_retry=recovered_by_retry,
            latency_ms=ai_result.total_latency_ms,
            total_tokens=ai_result.total_tokens,
            metadata=merged_metadata,
        )

    @staticmethod
    def failed_execution_sample(
        *,
        sample_id: str,
        human: HumanReviewGroundTruth,
        fallback_ai_verdict: AiReviewVerdict = AiReviewVerdict.REQUIRE_HUMAN,
        retry_count: int = 0,
        latency_ms: int | None = None,
        total_tokens: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> EvaluationSample:
        """Represent an execution that never produced a valid structured result."""

        return EvaluationSample(
            sample_id=sample_id,
            human_verdict=human.verdict,
            ai_verdict=fallback_ai_verdict,
            human_score=human.score,
            ai_score=None,
            structured_output_success=False,
            retry_count=retry_count,
            recovered_by_retry=False,
            latency_ms=latency_ms,
            total_tokens=total_tokens,
            metadata={"executionFailed": True, **(metadata or {})},
        )

    @staticmethod
    def dataset(
        *,
        name: str,
        version: str | None,
        samples: list[EvaluationSample],
    ) -> EvaluationDataset:
        return EvaluationDataset(name=name, version=version, samples=samples)
