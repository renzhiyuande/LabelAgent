"""Metrics for offline AI-review evaluation and baseline/candidate replay comparison."""
from __future__ import annotations

import math
from statistics import fmean

from app.schemas.ai_review import AiReviewVerdict
from app.schemas.evaluation import (
    EvaluationDataset,
    EvaluationMetrics,
    ReplayComparisonMetrics,
    ReplayComparisonRequest,
)


class OfflineEvaluationService:
    """Pure, deterministic evaluation logic with no network or model dependency."""

    @staticmethod
    def _round(value: float) -> float:
        return round(value, 6)

    @classmethod
    def _rate(cls, numerator: int, denominator: int) -> float:
        if denominator == 0:
            return 0.0
        return cls._round(numerator / denominator)

    @classmethod
    def _optional_rate(cls, numerator: int, denominator: int) -> float | None:
        if denominator == 0:
            return None
        return cls._round(numerator / denominator)

    @classmethod
    def _mean(cls, values: list[float]) -> float | None:
        if not values:
            return None
        return cls._round(fmean(values))

    @classmethod
    def _mae(cls, pairs: list[tuple[float, float]]) -> float | None:
        if not pairs:
            return None
        return cls._round(fmean(abs(predicted - expected) for expected, predicted in pairs))

    @classmethod
    def _percentile(cls, values: list[float], percentile: float) -> float | None:
        """Linear-interpolated percentile, matching common p95 monitoring semantics."""
        if not values:
            return None
        ordered = sorted(values)
        if len(ordered) == 1:
            return cls._round(float(ordered[0]))
        rank = (len(ordered) - 1) * percentile
        lower = math.floor(rank)
        upper = math.ceil(rank)
        if lower == upper:
            return cls._round(float(ordered[lower]))
        weight = rank - lower
        result = ordered[lower] * (1 - weight) + ordered[upper] * weight
        return cls._round(float(result))

    @staticmethod
    def _empty_confusion_matrix() -> dict[str, dict[str, int]]:
        verdicts = [verdict.value for verdict in AiReviewVerdict]
        return {human: {ai: 0 for ai in verdicts} for human in verdicts}

    def evaluate(self, dataset: EvaluationDataset) -> EvaluationMetrics:
        samples = dataset.samples
        sample_count = len(samples)
        agreement_count = sum(sample.human_verdict == sample.ai_verdict for sample in samples)

        confusion_matrix = self._empty_confusion_matrix()
        for sample in samples:
            confusion_matrix[sample.human_verdict.value][sample.ai_verdict.value] += 1

        score_pairs = [
            (sample.human_score, sample.ai_score)
            for sample in samples
            if sample.human_score is not None and sample.ai_score is not None
        ]
        structured_success_count = sum(sample.structured_output_success for sample in samples)
        retry_samples = [sample for sample in samples if sample.retry_count > 0]
        retry_recovered_count = sum(
            sample.recovered_by_retry and sample.structured_output_success for sample in retry_samples
        )
        latencies = [float(sample.latency_ms) for sample in samples if sample.latency_ms is not None]
        token_counts = [float(sample.total_tokens) for sample in samples if sample.total_tokens is not None]

        return EvaluationMetrics(
            sample_count=sample_count,
            agreement_count=agreement_count,
            agreement_rate=self._rate(agreement_count, sample_count),
            confusion_matrix=confusion_matrix,
            score_mae=self._mae(score_pairs),
            structured_output_success_rate=self._rate(structured_success_count, sample_count),
            retry_case_count=len(retry_samples),
            retry_recovered_count=retry_recovered_count,
            retry_recovery_rate=self._optional_rate(retry_recovered_count, len(retry_samples)),
            avg_latency_ms=self._mean(latencies),
            p95_latency_ms=self._percentile(latencies, 0.95),
            avg_total_tokens=self._mean(token_counts),
        )

    def compare(self, request: ReplayComparisonRequest) -> ReplayComparisonMetrics:
        samples = request.samples
        sample_count = len(samples)
        baseline_correct = [sample.baseline_verdict == sample.human_verdict for sample in samples]
        candidate_correct = [sample.candidate_verdict == sample.human_verdict for sample in samples]

        baseline_correct_count = sum(baseline_correct)
        candidate_correct_count = sum(candidate_correct)
        baseline_bad_case_count = sample_count - baseline_correct_count
        bad_case_fixed_count = sum(
            (not baseline_ok) and candidate_ok
            for baseline_ok, candidate_ok in zip(baseline_correct, candidate_correct)
        )
        regression_count = sum(
            baseline_ok and (not candidate_ok)
            for baseline_ok, candidate_ok in zip(baseline_correct, candidate_correct)
        )

        baseline_score_pairs = [
            (sample.human_score, sample.baseline_score)
            for sample in samples
            if sample.human_score is not None and sample.baseline_score is not None
        ]
        candidate_score_pairs = [
            (sample.human_score, sample.candidate_score)
            for sample in samples
            if sample.human_score is not None and sample.candidate_score is not None
        ]
        baseline_mae = self._mae(baseline_score_pairs)
        candidate_mae = self._mae(candidate_score_pairs)
        mae_delta = None
        if baseline_mae is not None and candidate_mae is not None:
            mae_delta = self._round(candidate_mae - baseline_mae)

        baseline_rate = self._rate(baseline_correct_count, sample_count)
        candidate_rate = self._rate(candidate_correct_count, sample_count)

        return ReplayComparisonMetrics(
            sample_count=sample_count,
            baseline_agreement_rate=baseline_rate,
            candidate_agreement_rate=candidate_rate,
            agreement_delta=self._round(candidate_rate - baseline_rate),
            baseline_bad_case_count=baseline_bad_case_count,
            bad_case_fixed_count=bad_case_fixed_count,
            bad_case_fix_rate=self._optional_rate(bad_case_fixed_count, baseline_bad_case_count),
            baseline_correct_count=baseline_correct_count,
            regression_count=regression_count,
            regression_rate=self._optional_rate(regression_count, baseline_correct_count),
            baseline_score_mae=baseline_mae,
            candidate_score_mae=candidate_mae,
            score_mae_delta=mae_delta,
        )
