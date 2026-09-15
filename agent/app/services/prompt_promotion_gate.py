"""Evaluate whether an optimized Prompt candidate is safe to promote."""
from __future__ import annotations

from app.schemas.evaluation import ReplayComparisonMetrics
from app.schemas.prompt_gate import (
    PromotionCheck,
    PromotionDecision,
    PromptPromotionPolicy,
    PromptPromotionResult,
)


class PromptPromotionGate:
    """Pure quality gate over offline replay metrics.

    A PASS here means the candidate is *eligible* for promotion.  The service
    intentionally does not mutate Prompt storage or production configuration.
    """

    @staticmethod
    def _check(
        *,
        name: str,
        actual: float | int | None,
        operator: str,
        threshold: float | int | None,
        passed: bool,
        note: str | None = None,
    ) -> PromotionCheck:
        return PromotionCheck(
            name=name,
            actual=actual,
            operator=operator,
            threshold=threshold,
            passed=passed,
            note=note,
        )

    def evaluate(
        self,
        *,
        baseline_version: str,
        candidate_version: str,
        metrics: ReplayComparisonMetrics,
        policy: PromptPromotionPolicy,
    ) -> PromptPromotionResult:
        if baseline_version == candidate_version:
            raise ValueError("baseline_version and candidate_version must differ")

        checks: list[PromotionCheck] = []
        reasons: list[str] = []
        insufficient_data = False

        sample_ok = metrics.sample_count >= policy.min_sample_count
        checks.append(
            self._check(
                name="sample_count",
                actual=metrics.sample_count,
                operator=">=",
                threshold=policy.min_sample_count,
                passed=sample_ok,
            )
        )
        if not sample_ok:
            insufficient_data = True
            reasons.append(
                f"sample_count={metrics.sample_count} < min_sample_count={policy.min_sample_count}"
            )

        if policy.min_candidate_agreement_rate is not None:
            agreement_ok = (
                metrics.candidate_agreement_rate >= policy.min_candidate_agreement_rate
            )
            checks.append(
                self._check(
                    name="candidate_agreement_rate",
                    actual=metrics.candidate_agreement_rate,
                    operator=">=",
                    threshold=policy.min_candidate_agreement_rate,
                    passed=agreement_ok,
                )
            )
            if not agreement_ok:
                reasons.append("candidate agreement rate is below policy threshold")

        delta_ok = metrics.agreement_delta >= policy.min_agreement_delta
        checks.append(
            self._check(
                name="agreement_delta",
                actual=metrics.agreement_delta,
                operator=">=",
                threshold=policy.min_agreement_delta,
                passed=delta_ok,
            )
        )
        if not delta_ok:
            reasons.append("candidate agreement regressed against baseline")

        if policy.min_bad_case_fix_rate is not None:
            if metrics.bad_case_fix_rate is None:
                insufficient_data = True
                fix_ok = False
                note = "baseline contained no bad cases, so bad-case fix rate is undefined"
                reasons.append(note)
            else:
                fix_ok = metrics.bad_case_fix_rate >= policy.min_bad_case_fix_rate
                note = None
                if not fix_ok:
                    reasons.append("bad-case fix rate is below policy threshold")
            checks.append(
                self._check(
                    name="bad_case_fix_rate",
                    actual=metrics.bad_case_fix_rate,
                    operator=">=",
                    threshold=policy.min_bad_case_fix_rate,
                    passed=fix_ok,
                    note=note,
                )
            )

        if metrics.regression_rate is None:
            insufficient_data = True
            regression_ok = False
            note = "baseline had no correct cases, so regression rate is undefined"
            reasons.append(note)
        else:
            regression_ok = metrics.regression_rate <= policy.max_regression_rate
            note = None
            if not regression_ok:
                reasons.append("candidate regressed too many baseline-correct samples")
        checks.append(
            self._check(
                name="regression_rate",
                actual=metrics.regression_rate,
                operator="<=",
                threshold=policy.max_regression_rate,
                passed=regression_ok,
                note=note,
            )
        )

        if policy.max_score_mae_delta is not None:
            if metrics.score_mae_delta is None:
                mae_ok = False
                note = "paired score MAE is unavailable"
                insufficient_data = True
                reasons.append(note)
            else:
                mae_ok = metrics.score_mae_delta <= policy.max_score_mae_delta
                note = None
                if not mae_ok:
                    reasons.append("candidate score MAE regressed beyond policy threshold")
            checks.append(
                self._check(
                    name="score_mae_delta",
                    actual=metrics.score_mae_delta,
                    operator="<=",
                    threshold=policy.max_score_mae_delta,
                    passed=mae_ok,
                    note=note,
                )
            )

        all_checks_pass = all(check.passed for check in checks)
        if insufficient_data:
            decision = PromotionDecision.INSUFFICIENT_DATA
            eligible = False
        elif all_checks_pass:
            decision = PromotionDecision.PROMOTE
            eligible = True
        else:
            decision = PromotionDecision.REJECT
            eligible = False

        return PromptPromotionResult(
            baseline_version=baseline_version,
            candidate_version=candidate_version,
            decision=decision,
            eligible_for_promotion=eligible,
            checks=checks,
            reasons=reasons,
        )
