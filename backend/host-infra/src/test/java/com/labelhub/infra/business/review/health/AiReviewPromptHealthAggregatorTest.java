package com.labelhub.infra.business.review.health;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.core.review.AiReviewPromptHealthMetrics;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionAppealEntity;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("P0 — AiReviewPromptHealthAggregator pure logic")
class AiReviewPromptHealthAggregatorTest {

    @Nested
    @DisplayName("isVerdictAgreed")
    class VerdictAgreement {
        @Test
        void agreesWhenPassMatchesPass() {
            assertThat(AiReviewPromptHealthAggregator.isVerdictAgreed("PASS", "PASS")).isTrue();
        }

        @Test
        void disagreesWhenRejectVsPass() {
            assertThat(AiReviewPromptHealthAggregator.isVerdictAgreed("REJECT", "PASS")).isFalse();
        }

        @Test
        void disagreesWhenRequireHumanVsPass() {
            assertThat(AiReviewPromptHealthAggregator.isVerdictAgreed("REQUIRE_HUMAN", "PASS")).isFalse();
        }

        @Test
        void normalizesCase() {
            assertThat(AiReviewPromptHealthAggregator.isVerdictAgreed("pass", "PASS")).isTrue();
        }
    }

    @Nested
    @DisplayName("classifyMisalignmentType")
    class MisalignmentClassification {
        @Test
        void appealApprovedOverAiRejectIsAppealOverturn() {
            assertThat(AiReviewPromptHealthAggregator.classifyMisalignmentType(
                            "REJECT", "PASS", 99L, "APPROVED"))
                    .isEqualTo("APPEAL_OVERTURN");
        }

        @Test
        void aiRejectHumanPassIsAiStrict() {
            assertThat(AiReviewPromptHealthAggregator.classifyMisalignmentType(
                            "REJECT", "PASS", null, null))
                    .isEqualTo("AI_STRICT");
        }

        @Test
        void aiPassHumanRejectIsAiLenient() {
            assertThat(AiReviewPromptHealthAggregator.classifyMisalignmentType(
                            "PASS", "REJECT", null, null))
                    .isEqualTo("AI_LENIENT");
        }

        @Test
        void aiPassHumanReturnIsAiLenient() {
            assertThat(AiReviewPromptHealthAggregator.classifyMisalignmentType(
                            "PASS", "RETURN", null, null))
                    .isEqualTo("AI_LENIENT");
        }

        @Test
        void otherMismatchIsVerdictMismatch() {
            assertThat(AiReviewPromptHealthAggregator.classifyMisalignmentType(
                            "REQUIRE_HUMAN", "REJECT", null, null))
                    .isEqualTo("VERDICT_MISMATCH");
        }
    }

    @Nested
    @DisplayName("classifyHealthStatus")
    class HealthStatusClassification {
        @Test
        void insufficientSampleIsWarning() {
            AiReviewPromptHealthMetrics.MetricsDetail metrics =
                    new AiReviewPromptHealthMetrics.MetricsDetail(0.5, 0.5, 0.5, 0.1);
            assertThat(AiReviewPromptHealthAggregator.classifyHealthStatus(10, metrics))
                    .isEqualTo(AiReviewPromptHealthAggregator.HEALTH_WARNING);
        }

        @Test
        void lowAgreementNeedsOptimization() {
            AiReviewPromptHealthMetrics.MetricsDetail metrics =
                    new AiReviewPromptHealthMetrics.MetricsDetail(0.65, 0.1, 0.1, 0.05);
            assertThat(AiReviewPromptHealthAggregator.classifyHealthStatus(40, metrics))
                    .isEqualTo(AiReviewPromptHealthAggregator.HEALTH_NEEDS_OPTIMIZATION);
        }

        @Test
        void highAppealPassRateNeedsOptimization() {
            AiReviewPromptHealthMetrics.MetricsDetail metrics =
                    new AiReviewPromptHealthMetrics.MetricsDetail(0.85, 0.45, 0.1, 0.05);
            assertThat(AiReviewPromptHealthAggregator.classifyHealthStatus(40, metrics))
                    .isEqualTo(AiReviewPromptHealthAggregator.HEALTH_NEEDS_OPTIMIZATION);
        }

        @Test
        void highPassRejectRateNeedsOptimization() {
            AiReviewPromptHealthMetrics.MetricsDetail metrics =
                    new AiReviewPromptHealthMetrics.MetricsDetail(0.85, 0.1, 0.35, 0.05);
            assertThat(AiReviewPromptHealthAggregator.classifyHealthStatus(40, metrics))
                    .isEqualTo(AiReviewPromptHealthAggregator.HEALTH_NEEDS_OPTIMIZATION);
        }

        @Test
        void healthyWhenMetricsWithinThresholds() {
            AiReviewPromptHealthMetrics.MetricsDetail metrics =
                    new AiReviewPromptHealthMetrics.MetricsDetail(0.85, 0.2, 0.1, 0.05);
            assertThat(AiReviewPromptHealthAggregator.classifyHealthStatus(40, metrics))
                    .isEqualTo(AiReviewPromptHealthAggregator.HEALTH_HEALTHY);
        }
    }

    @Nested
    @DisplayName("resolveHumanLabel")
    class HumanLabelResolution {
        @Test
        void appealApprovedMapsToPass() {
            AiReviewRecordEntity ai = aiReview("REJECT", Instant.parse("2026-06-01T10:00:00Z"));
            SubmissionAppealEntity appeal = appeal("APPROVED", Instant.parse("2026-06-02T10:00:00Z"));
            assertThat(AiReviewPromptHealthAggregator.resolveHumanLabel(ai, null, appeal))
                    .isEqualTo("PASS");
        }

        @Test
        void appealRejectedMapsToReject() {
            AiReviewRecordEntity ai = aiReview("PASS", Instant.parse("2026-06-01T10:00:00Z"));
            SubmissionAppealEntity appeal = appeal("REJECTED", Instant.parse("2026-06-02T10:00:00Z"));
            assertThat(AiReviewPromptHealthAggregator.resolveHumanLabel(ai, null, appeal))
                    .isEqualTo("REJECT");
        }

        @Test
        void reviewActionTakesPrecedenceWhenNoDecidedAppeal() {
            AiReviewRecordEntity ai = aiReview("PASS", Instant.parse("2026-06-01T10:00:00Z"));
            ReviewRecordEntity review = new ReviewRecordEntity();
            review.setAction("REJECT");
            assertThat(AiReviewPromptHealthAggregator.resolveHumanLabel(ai, review, null))
                    .isEqualTo("REJECT");
        }

        @Test
        void weakPassLabelWhenAiPassAndNoHumanIntervention() {
            AiReviewRecordEntity ai = aiReview("PASS", Instant.parse("2026-06-01T10:00:00Z"));
            assertThat(AiReviewPromptHealthAggregator.resolveHumanLabel(ai, null, null))
                    .isEqualTo("PASS");
        }
    }

    @Nested
    @DisplayName("computeMetrics")
    class MetricsComputation {
        @Test
        void computesAgreementAndRates() {
            AiReviewRecordEntity strict = aiReview("REJECT", Instant.now());
            AiReviewRecordEntity lenient = aiReview("PASS", Instant.now());
            AiReviewRecordEntity agreed = aiReview("PASS", Instant.now());

            List<AiReviewPromptHealthAggregator.VersionSample> samples = List.of(
                    new AiReviewPromptHealthAggregator.VersionSample(
                            strict, null, null, appeal("APPROVED", Instant.now()), "PASS"),
                    new AiReviewPromptHealthAggregator.VersionSample(
                            lenient, null, review("REJECT"), null, "REJECT"),
                    new AiReviewPromptHealthAggregator.VersionSample(
                            agreed, null, null, null, "PASS"));

            AiReviewPromptHealthMetrics.MetricsDetail metrics =
                    AiReviewPromptHealthAggregator.computeMetrics(samples);

            assertThat(metrics.aiHumanAgreementRate()).isEqualTo(1.0 / 3.0);
            assertThat(metrics.aiRejectAppealPassRate()).isEqualTo(1.0);
            assertThat(metrics.aiPassHumanRejectRate()).isEqualTo(0.5);
            assertThat(metrics.requireHumanRatio()).isEqualTo(0.0);
        }
    }

    @Nested
    @DisplayName("assignSplitTag")
    class SplitAssignment {
        @Test
        void assignsSeventyThirtySplit() {
            assertThat(AiReviewPromptHealthAggregator.assignSplitTag(0, 10)).isEqualTo("TRAIN");
            assertThat(AiReviewPromptHealthAggregator.assignSplitTag(6, 10)).isEqualTo("TRAIN");
            assertThat(AiReviewPromptHealthAggregator.assignSplitTag(7, 10)).isEqualTo("TEST");
        }
    }

    private static AiReviewRecordEntity aiReview(String verdict, Instant finishedAt) {
        AiReviewRecordEntity entity = new AiReviewRecordEntity();
        entity.setVerdict(verdict);
        entity.setFinishedAt(finishedAt);
        return entity;
    }

    private static SubmissionAppealEntity appeal(String status, Instant decidedAt) {
        SubmissionAppealEntity entity = new SubmissionAppealEntity();
        entity.setStatus(status);
        entity.setDecidedAt(decidedAt);
        return entity;
    }

    private static ReviewRecordEntity review(String action) {
        ReviewRecordEntity entity = new ReviewRecordEntity();
        entity.setAction(action);
        return entity;
    }
}
