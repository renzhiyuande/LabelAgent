"""稳定性指标计算的单元测试（不调用 LLM）。"""
from __future__ import annotations

from app.schemas.ai_review import AiReviewDimensionResult, AiReviewResult, AiReviewVerdict
from .stability_metrics import compute_repeat_run_metrics


def _result(total_score: float, verdict: AiReviewVerdict, accuracy: float) -> AiReviewResult:
    return AiReviewResult(
        platformKey="mock",
        modelId="mock",
        verdict=verdict,
        totalScore=total_score,
        summary="ok",
        dimensions=[
            AiReviewDimensionResult(
                dimensionKey="accuracy",
                dimensionName="准确性",
                score=accuracy,
                weight=1.0,
                verdict=AiReviewVerdict.PASS,
                comment="",
            )
        ],
    )


def test_compute_repeat_run_metrics_marks_stable_runs() -> None:
    runs = [_result(88.0, AiReviewVerdict.PASS, 88.0) for _ in range(3)]
    metrics = compute_repeat_run_metrics(runs, max_total_score_stddev=5.0)
    assert metrics["passed"] is True
    assert metrics["scoreStability"] == "stable"
    assert metrics["totalScoreStdDev"] == 0.0


def test_compute_repeat_run_metrics_marks_unstable_score_spread() -> None:
    runs = [
        _result(70.0, AiReviewVerdict.PASS, 70.0),
        _result(90.0, AiReviewVerdict.PASS, 90.0),
    ]
    metrics = compute_repeat_run_metrics(runs, max_total_score_stddev=5.0)
    assert metrics["passed"] is False
    assert metrics["scoreStability"] == "unstable"
    assert metrics["totalScoreRange"] == 20.0


def test_compute_repeat_run_metrics_marks_unstable_verdict_flip() -> None:
    runs = [
        _result(88.0, AiReviewVerdict.PASS, 88.0),
        _result(88.0, AiReviewVerdict.REJECT, 88.0),
    ]
    metrics = compute_repeat_run_metrics(runs, max_total_score_stddev=0.0)
    assert metrics["passed"] is False
    assert metrics["verdictStable"] is False


def test_compute_repeat_run_metrics_median_mode_tolerates_single_outlier() -> None:
    runs = [
        _result(100.0, AiReviewVerdict.PASS, 100.0),
        _result(74.0, AiReviewVerdict.PASS, 74.0),
        _result(87.0, AiReviewVerdict.PASS, 87.0),
    ]
    metrics = compute_repeat_run_metrics(
        runs,
        max_total_score_median_deviation=15.0,
        max_dimension_median_deviation=15.0,
    )
    assert metrics["evaluationMode"] == "median_deviation"
    assert metrics["totalScoreMedianDeviation"] == 13.0
    assert metrics["passed"] is True
