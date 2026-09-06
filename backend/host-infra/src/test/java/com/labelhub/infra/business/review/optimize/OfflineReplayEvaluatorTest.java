package com.labelhub.infra.business.review.optimize;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.infra.business.review.optimize.OfflineReplayEvaluator.CaseOutcome;
import com.labelhub.infra.business.review.optimize.OfflineReplayEvaluator.ReplayMetrics;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("P2 — OfflineReplayEvaluator A/B decision logic")
class OfflineReplayEvaluatorTest {

    @Nested
    @DisplayName("metric computation")
    class MetricComputation {
        @Test
        void computesAgreementRate() {
            List<CaseOutcome> outcomes = List.of(
                    new CaseOutcome("PASS", "PASS"),
                    new CaseOutcome("PASS", "REJECT"),
                    new CaseOutcome("REJECT", "REJECT"));
            assertThat(OfflineReplayEvaluator.computeAgreementRate(outcomes)).isEqualTo(2.0 / 3.0);
        }

        @Test
        void computesAiStrictRate() {
            List<CaseOutcome> outcomes = List.of(
                    new CaseOutcome("PASS", "REJECT"),
                    new CaseOutcome("PASS", "REJECT"),
                    new CaseOutcome("PASS", "PASS"));
            assertThat(OfflineReplayEvaluator.computeAiStrictRate(outcomes)).isEqualTo(2.0 / 3.0);
        }

        @Test
        void computesAiLenientRate() {
            List<CaseOutcome> outcomes = List.of(
                    new CaseOutcome("REJECT", "PASS"),
                    new CaseOutcome("RETURN", "PASS"),
                    new CaseOutcome("REJECT", "REJECT"));
            assertThat(OfflineReplayEvaluator.computeAiLenientRate(outcomes)).isEqualTo(2.0 / 3.0);
        }
    }

    @Nested
    @DisplayName("passesAbTest")
    class AbTestDecision {
        @Test
        void passesWhenCandidateImprovesAllThresholds() {
            ReplayMetrics baseline = new ReplayMetrics(10, 0.60, 0.30, 0.20);
            ReplayMetrics candidate = new ReplayMetrics(10, 0.66, 0.24, 0.14);
            assertThat(OfflineReplayEvaluator.passesAbTest(baseline, candidate, 0.05)).isTrue();
        }

        @Test
        void failsWhenAgreementImprovementInsufficient() {
            ReplayMetrics baseline = new ReplayMetrics(10, 0.60, 0.30, 0.20);
            ReplayMetrics candidate = new ReplayMetrics(10, 0.64, 0.24, 0.14);
            assertThat(OfflineReplayEvaluator.passesAbTest(baseline, candidate, 0.05)).isFalse();
        }

        @Test
        void failsWhenStrictRateNotReducedEnough() {
            ReplayMetrics baseline = new ReplayMetrics(10, 0.60, 0.30, 0.20);
            ReplayMetrics candidate = new ReplayMetrics(10, 0.66, 0.28, 0.14);
            assertThat(OfflineReplayEvaluator.passesAbTest(baseline, candidate, 0.05)).isFalse();
        }

        @Test
        void failsWhenLenientRateNotReducedEnough() {
            ReplayMetrics baseline = new ReplayMetrics(10, 0.60, 0.30, 0.20);
            ReplayMetrics candidate = new ReplayMetrics(10, 0.66, 0.24, 0.18);
            assertThat(OfflineReplayEvaluator.passesAbTest(baseline, candidate, 0.05)).isFalse();
        }

        @Test
        void failsWhenTrainOverfitGapTooLarge() {
            ReplayMetrics baseline = new ReplayMetrics(10, 0.60, 0.30, 0.20);
            ReplayMetrics candidate = new ReplayMetrics(10, 0.66, 0.24, 0.14);
            assertThat(OfflineReplayEvaluator.passesAbTest(baseline, candidate, 0.12)).isFalse();
        }

        @Test
        void failsWhenNoTestCases() {
            ReplayMetrics baseline = ReplayMetrics.empty();
            ReplayMetrics candidate = new ReplayMetrics(10, 0.80, 0.10, 0.05);
            assertThat(OfflineReplayEvaluator.passesAbTest(baseline, candidate, 0.02)).isFalse();
        }
    }
}
