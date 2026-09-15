from app.schemas.evaluation import ReplayComparisonMetrics
from app.schemas.prompt_gate import PromotionDecision, PromptPromotionPolicy
from app.services.prompt_promotion_gate import PromptPromotionGate


def _metrics(**overrides) -> ReplayComparisonMetrics:
    payload = {
        "sampleCount": 300,
        "baselineAgreementRate": 0.76,
        "candidateAgreementRate": 0.82,
        "agreementDelta": 0.06,
        "baselineBadCaseCount": 72,
        "badCaseFixedCount": 30,
        "badCaseFixRate": 0.416667,
        "baselineCorrectCount": 228,
        "regressionCount": 5,
        "regressionRate": 0.02193,
        "baselineScoreMae": 8.2,
        "candidateScoreMae": 7.1,
        "scoreMaeDelta": -1.1,
    }
    payload.update(overrides)
    return ReplayComparisonMetrics.model_validate(payload)


def _policy() -> PromptPromotionPolicy:
    return PromptPromotionPolicy(
        minSampleCount=200,
        minCandidateAgreementRate=0.80,
        minAgreementDelta=0.0,
        minBadCaseFixRate=0.30,
        maxRegressionRate=0.05,
        maxScoreMaeDelta=0.0,
    )


def test_candidate_is_eligible_when_all_quality_checks_pass():
    result = PromptPromotionGate().evaluate(
        baseline_version="review-v1",
        candidate_version="review-v2",
        metrics=_metrics(),
        policy=_policy(),
    )

    assert result.decision == PromotionDecision.PROMOTE
    assert result.eligible_for_promotion is True
    assert result.reasons == []
    assert all(check.passed for check in result.checks)


def test_regression_blocks_candidate_even_when_bad_cases_improve():
    result = PromptPromotionGate().evaluate(
        baseline_version="review-v1",
        candidate_version="review-v2",
        metrics=_metrics(regressionRate=0.08, regressionCount=19),
        policy=_policy(),
    )

    assert result.decision == PromotionDecision.REJECT
    assert result.eligible_for_promotion is False
    assert any("regressed too many" in reason for reason in result.reasons)


def test_small_dataset_is_marked_insufficient_instead_of_rejected():
    result = PromptPromotionGate().evaluate(
        baseline_version="review-v1",
        candidate_version="review-v2",
        metrics=_metrics(sampleCount=50),
        policy=_policy(),
    )

    assert result.decision == PromotionDecision.INSUFFICIENT_DATA
    assert result.eligible_for_promotion is False


def test_missing_paired_score_mae_is_insufficient_when_policy_requires_it():
    result = PromptPromotionGate().evaluate(
        baseline_version="review-v1",
        candidate_version="review-v2",
        metrics=_metrics(baselineScoreMae=None, candidateScoreMae=None, scoreMaeDelta=None),
        policy=_policy(),
    )

    assert result.decision == PromotionDecision.INSUFFICIENT_DATA
    assert any("paired score MAE" in reason for reason in result.reasons)


def test_gate_rejects_comparing_same_prompt_version():
    try:
        PromptPromotionGate().evaluate(
            baseline_version="same",
            candidate_version="same",
            metrics=_metrics(),
            policy=_policy(),
        )
    except ValueError as exc:
        assert "must differ" in str(exc)
    else:
        raise AssertionError("expected ValueError")
