from app.schemas.ai_review import (
    AiReviewLlmAttemptResult,
    AiReviewResult,
    AiReviewVerdict,
)
from app.services.evaluation_dataset_builder import (
    EvaluationDatasetBuilder,
    HumanReviewGroundTruth,
)


def _result() -> AiReviewResult:
    return AiReviewResult(
        platformKey="openai-compatible",
        modelId="demo-model",
        verdict="PASS",
        totalScore=88.0,
        summary="ok",
        parsedResult={"verdict": "PASS", "engineSuccess": True},
        providerRequestId="req-1",
        totalLatencyMs=321,
        attemptCount=3,
        totalTokens=456,
        llmAttempts=[
            AiReviewLlmAttemptResult(attemptNo=1, success=False, errorMessage="invalid json"),
            AiReviewLlmAttemptResult(attemptNo=2, success=True),
            AiReviewLlmAttemptResult(attemptNo=3, success=True),
        ],
    )


def test_builder_counts_failed_attempts_not_consensus_runs():
    sample = EvaluationDatasetBuilder.from_review_result(
        sample_id="submission-1",
        ai_result=_result(),
        human=HumanReviewGroundTruth(
            verdict=AiReviewVerdict.PASS,
            score=90.0,
            reviewer_id="reviewer-7",
        ),
    )

    assert sample.retry_count == 1
    assert sample.recovered_by_retry is True
    assert sample.structured_output_success is True
    assert sample.ai_score == 88.0
    assert sample.human_score == 90.0
    assert sample.metadata["reviewerId"] == "reviewer-7"


def test_diagnostic_parsed_result_does_not_hide_engine_failure():
    failed = _result().model_copy(
        update={
            "verdict": AiReviewVerdict.REQUIRE_HUMAN,
            "parsed_result": {"engineSuccess": False, "attempts": 3, "error": "schema validation"},
            "llm_attempts": [
                AiReviewLlmAttemptResult(attemptNo=1, success=False),
                AiReviewLlmAttemptResult(attemptNo=2, success=False),
                AiReviewLlmAttemptResult(attemptNo=3, success=False),
            ],
        }
    )

    sample = EvaluationDatasetBuilder.from_review_result(
        sample_id="submission-failed",
        ai_result=failed,
        human=HumanReviewGroundTruth(verdict=AiReviewVerdict.REJECT),
    )

    assert sample.structured_output_success is False
    assert sample.recovered_by_retry is False
    assert sample.retry_count == 3


def test_builder_can_represent_terminal_structured_output_failure():
    sample = EvaluationDatasetBuilder.failed_execution_sample(
        sample_id="submission-2",
        human=HumanReviewGroundTruth(verdict=AiReviewVerdict.REJECT, score=30.0),
        retry_count=2,
        latency_ms=900,
        metadata={"failureType": "schema_validation"},
    )

    assert sample.structured_output_success is False
    assert sample.recovered_by_retry is False
    assert sample.ai_verdict == AiReviewVerdict.REQUIRE_HUMAN
    assert sample.metadata["executionFailed"] is True
    assert sample.metadata["failureType"] == "schema_validation"


def test_dataset_builder_keeps_dataset_identity():
    sample = EvaluationDatasetBuilder.from_review_result(
        sample_id="submission-3",
        ai_result=_result(),
        human=HumanReviewGroundTruth(verdict=AiReviewVerdict.PASS),
    )
    dataset = EvaluationDatasetBuilder.dataset(
        name="reviewer-gold-set",
        version="2026-09-15",
        samples=[sample],
    )

    assert dataset.name == "reviewer-gold-set"
    assert dataset.version == "2026-09-15"
    assert dataset.samples[0].sample_id == "submission-3"
