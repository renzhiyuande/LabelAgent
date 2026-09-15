import pytest
from pydantic import ValidationError

from app.schemas.evaluation import (
    EvaluationDataset,
    EvaluationSample,
    ReplayComparisonRequest,
)
from app.services.evaluation_service import OfflineEvaluationService


def test_evaluate_dataset_metrics_and_runtime_stats():
    dataset = EvaluationDataset.model_validate(
        {
            "name": "reviewer-ground-truth",
            "version": "2026-09-15",
            "samples": [
                {
                    "sampleId": "s1",
                    "humanVerdict": "PASS",
                    "aiVerdict": "PASS",
                    "humanScore": 90,
                    "aiScore": 88,
                    "structuredOutputSuccess": True,
                    "retryCount": 0,
                    "latencyMs": 100,
                    "totalTokens": 1000,
                },
                {
                    "sampleId": "s2",
                    "humanVerdict": "REJECT",
                    "aiVerdict": "PASS",
                    "humanScore": 40,
                    "aiScore": 60,
                    "structuredOutputSuccess": True,
                    "retryCount": 1,
                    "recoveredByRetry": True,
                    "latencyMs": 200,
                    "totalTokens": 1500,
                },
                {
                    "sampleId": "s3",
                    "humanVerdict": "REQUIRE_HUMAN",
                    "aiVerdict": "REQUIRE_HUMAN",
                    "structuredOutputSuccess": False,
                    "retryCount": 2,
                    "latencyMs": 300,
                },
                {
                    "sampleId": "s4",
                    "humanVerdict": "PASS",
                    "aiVerdict": "PASS",
                    "humanScore": 80,
                    "aiScore": 78,
                    "structuredOutputSuccess": True,
                    "retryCount": 0,
                    "latencyMs": 400,
                    "totalTokens": 500,
                },
            ],
        }
    )

    metrics = OfflineEvaluationService().evaluate(dataset)

    assert metrics.sample_count == 4
    assert metrics.agreement_count == 3
    assert metrics.agreement_rate == 0.75
    assert metrics.score_mae == 8.0
    assert metrics.structured_output_success_rate == 0.75
    assert metrics.retry_case_count == 2
    assert metrics.retry_recovered_count == 1
    assert metrics.retry_recovery_rate == 0.5
    assert metrics.avg_latency_ms == 250.0
    assert metrics.p95_latency_ms == 385.0
    assert metrics.avg_total_tokens == 1000.0
    assert metrics.confusion_matrix["REJECT"]["PASS"] == 1


def test_compare_replay_reports_fixes_and_regressions():
    request = ReplayComparisonRequest.model_validate(
        {
            "baselineVersion": "prompt-v1",
            "candidateVersion": "prompt-v2",
            "samples": [
                {
                    "sampleId": "s1",
                    "humanVerdict": "PASS",
                    "baselineVerdict": "REJECT",
                    "candidateVerdict": "PASS",
                    "humanScore": 90,
                    "baselineScore": 65,
                    "candidateScore": 88,
                },
                {
                    "sampleId": "s2",
                    "humanVerdict": "REJECT",
                    "baselineVerdict": "REJECT",
                    "candidateVerdict": "PASS",
                    "humanScore": 40,
                    "baselineScore": 42,
                    "candidateScore": 60,
                },
                {
                    "sampleId": "s3",
                    "humanVerdict": "REQUIRE_HUMAN",
                    "baselineVerdict": "PASS",
                    "candidateVerdict": "REQUIRE_HUMAN",
                },
                {
                    "sampleId": "s4",
                    "humanVerdict": "PASS",
                    "baselineVerdict": "PASS",
                    "candidateVerdict": "PASS",
                    "humanScore": 80,
                    "baselineScore": 75,
                    "candidateScore": 79,
                },
            ],
        }
    )

    metrics = OfflineEvaluationService().compare(request)

    assert metrics.sample_count == 4
    assert metrics.baseline_agreement_rate == 0.5
    assert metrics.candidate_agreement_rate == 0.75
    assert metrics.agreement_delta == 0.25
    assert metrics.baseline_bad_case_count == 2
    assert metrics.bad_case_fixed_count == 2
    assert metrics.bad_case_fix_rate == 1.0
    assert metrics.baseline_correct_count == 2
    assert metrics.regression_count == 1
    assert metrics.regression_rate == 0.5
    assert metrics.baseline_score_mae == pytest.approx(10.666667)
    assert metrics.candidate_score_mae == pytest.approx(7.666667)
    assert metrics.score_mae_delta == pytest.approx(-3.0)


def test_empty_dataset_is_safe_and_explicit():
    metrics = OfflineEvaluationService().evaluate(EvaluationDataset(name="empty", samples=[]))

    assert metrics.sample_count == 0
    assert metrics.agreement_rate == 0.0
    assert metrics.structured_output_success_rate == 0.0
    assert metrics.retry_recovery_rate is None
    assert metrics.score_mae is None
    assert metrics.p95_latency_ms is None


def test_recovered_by_retry_requires_actual_retry():
    with pytest.raises(ValidationError):
        EvaluationSample.model_validate(
            {
                "sampleId": "bad",
                "humanVerdict": "PASS",
                "aiVerdict": "PASS",
                "retryCount": 0,
                "recoveredByRetry": True,
            }
        )


def test_baseline_and_candidate_versions_must_differ():
    with pytest.raises(ValidationError):
        ReplayComparisonRequest.model_validate(
            {
                "baselineVersion": "prompt-v1",
                "candidateVersion": "prompt-v1",
                "samples": [],
            }
        )
