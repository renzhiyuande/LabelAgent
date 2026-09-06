"""同输入多次预审的稳定性指标计算（用于 Live Golden Set 验收）。"""
from __future__ import annotations

from statistics import median, pstdev
from typing import Any

from app.schemas.ai_review import AiReviewResult


def _max_deviation_from_median(values: list[float]) -> float:
    if len(values) <= 1:
        return 0.0
    center = float(median(values))
    return max(abs(value - center) for value in values)


def compute_repeat_run_metrics(
    runs: list[AiReviewResult],
    *,
    max_total_score_stddev: float | None = None,
    max_dimension_stddev: float | None = None,
    max_total_score_median_deviation: float | None = None,
    max_dimension_median_deviation: float | None = None,
    require_verdict_stable: bool = True,
) -> dict[str, Any]:
    if not runs:
        raise ValueError("runs must not be empty")

    total_scores = [float(run.total_score) for run in runs]
    verdicts = [run.verdict.value for run in runs]
    total_score_stddev = pstdev(total_scores) if len(total_scores) > 1 else 0.0
    total_score_median = float(median(total_scores))
    total_score_median_deviation = _max_deviation_from_median(total_scores)
    verdict_stable = len(set(verdicts)) == 1

    dimension_values: dict[str, list[float]] = {}
    for run in runs:
        for dimension in run.dimensions:
            dimension_values.setdefault(dimension.dimension_key, []).append(float(dimension.score))

    dimension_stddevs = {
        key: (pstdev(values) if len(values) > 1 else 0.0)
        for key, values in sorted(dimension_values.items())
    }
    dimension_median_deviations = {
        key: _max_deviation_from_median(values) for key, values in sorted(dimension_values.items())
    }
    observed_max_dimension_stddev = max(dimension_stddevs.values(), default=0.0)
    observed_max_dimension_median_deviation = max(dimension_median_deviations.values(), default=0.0)

    use_median_mode = (
        max_total_score_median_deviation is not None
        or max_dimension_median_deviation is not None
    )
    if use_median_mode:
        total_threshold = max_total_score_median_deviation
        dimension_threshold = (
            max_total_score_median_deviation
            if max_dimension_median_deviation is None
            else max_dimension_median_deviation
        )
        score_stable = (
            total_threshold is not None
            and total_score_median_deviation <= total_threshold
            and observed_max_dimension_median_deviation <= dimension_threshold
        )
    else:
        total_threshold = max_total_score_stddev if max_total_score_stddev is not None else 5.0
        dimension_threshold = (
            total_threshold if max_dimension_stddev is None else max_dimension_stddev
        )
        score_stable = (
            total_score_stddev <= total_threshold
            and observed_max_dimension_stddev <= dimension_threshold
        )

    if require_verdict_stable:
        score_stable = score_stable and verdict_stable

    thresholds: dict[str, Any] = {"requireVerdictStable": require_verdict_stable}
    if use_median_mode:
        thresholds["maxTotalScoreMedianDeviation"] = total_threshold
        thresholds["maxDimensionMedianDeviation"] = dimension_threshold
    else:
        thresholds["maxTotalScoreStdDev"] = total_threshold
        thresholds["maxDimensionStdDev"] = dimension_threshold

    return {
        "runCount": len(runs),
        "totalScores": total_scores,
        "totalScoreMedian": round(total_score_median, 4),
        "totalScoreMedianDeviation": round(total_score_median_deviation, 4),
        "totalScoreStdDev": round(total_score_stddev, 4),
        "totalScoreRange": round(max(total_scores) - min(total_scores), 4),
        "verdicts": verdicts,
        "verdictStable": verdict_stable,
        "dimensionStdDevs": {key: round(value, 4) for key, value in dimension_stddevs.items()},
        "dimensionMedianDeviations": {
            key: round(value, 4) for key, value in dimension_median_deviations.items()
        },
        "maxDimensionStdDev": round(observed_max_dimension_stddev, 4),
        "maxDimensionMedianDeviation": round(observed_max_dimension_median_deviation, 4),
        "scoreStability": "stable" if score_stable else "unstable",
        "passed": score_stable,
        "evaluationMode": "median_deviation" if use_median_mode else "stddev",
        "thresholds": thresholds,
    }
