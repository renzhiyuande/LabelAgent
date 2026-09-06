package com.labelhub.infra.business.review.optimize;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.review.AiReviewContext;
import com.labelhub.core.review.AiReviewEngine;
import com.labelhub.core.review.AiReviewResult;
import com.labelhub.infra.business.review.health.AiReviewPromptHealthAggregator;
import com.labelhub.infra.persistence.entity.AiReviewMisalignmentCaseEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OfflineReplayEvaluator {
    private static final Logger log = LoggerFactory.getLogger(OfflineReplayEvaluator.class);

    /** 手动 Prompt 优化离线重放上限，避免上百次真实 LLM 调用导致任务长时间 RUNNING。 */
    public static final int MAX_TRAIN_CASES = 8;
    public static final int MAX_TEST_CASES = 12;
    public static final double AGREEMENT_IMPROVEMENT_THRESHOLD = 0.05;
    public static final double STRICT_REDUCTION_THRESHOLD = 0.05;
    public static final double LENIENT_REDUCTION_THRESHOLD = 0.05;
    public static final double TRAIN_OVERFIT_GAP_THRESHOLD = 0.10;

    private final AiReviewEngine aiReviewEngine;
    private final ObjectMapper objectMapper;

    public OfflineReplayEvaluator(AiReviewEngine aiReviewEngine, ObjectMapper objectMapper) {
        this.aiReviewEngine = aiReviewEngine;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> evaluate(
            TemplateVersionEntity version,
            List<AiReviewContext.AiReviewDimensionSpec> dimensions,
            String baselinePrompt,
            String candidatePrompt,
            List<AiReviewMisalignmentCaseEntity> trainCases,
            List<AiReviewMisalignmentCaseEntity> testCases) {
        return evaluate(version, dimensions, baselinePrompt, candidatePrompt, trainCases, testCases, null);
    }

    public Map<String, Object> evaluate(
            TemplateVersionEntity version,
            List<AiReviewContext.AiReviewDimensionSpec> dimensions,
            String baselinePrompt,
            String candidatePrompt,
            List<AiReviewMisalignmentCaseEntity> trainCases,
            List<AiReviewMisalignmentCaseEntity> testCases,
            Runnable heartbeat) {
        List<AiReviewMisalignmentCaseEntity> limitedTrain = limitCases(trainCases, MAX_TRAIN_CASES);
        List<AiReviewMisalignmentCaseEntity> limitedTest = limitCases(testCases, MAX_TEST_CASES);
        int rawTrainCount = trainCases == null ? 0 : trainCases.size();
        int rawTestCount = testCases == null ? 0 : testCases.size();
        if (rawTrainCount > limitedTrain.size() || rawTestCount > limitedTest.size()) {
            log.info(
                    "Offline replay case cap applied train={}/{} test={}/{}",
                    limitedTrain.size(),
                    rawTrainCount,
                    limitedTest.size(),
                    rawTestCount);
        }
        ReplayMetrics baselineTrain =
                replaySplit(version, dimensions, baselinePrompt, limitedTrain, "baseline-train", heartbeat);
        ReplayMetrics candidateTrain =
                replaySplit(version, dimensions, candidatePrompt, limitedTrain, "candidate-train", heartbeat);
        ReplayMetrics baselineTest =
                replaySplit(version, dimensions, baselinePrompt, limitedTest, "baseline-test", heartbeat);
        ReplayMetrics candidateTest =
                replaySplit(version, dimensions, candidatePrompt, limitedTest, "candidate-test", heartbeat);

        double trainOverfitGap = candidateTrain.agreementRate() - candidateTest.agreementRate();
        boolean passed = passesAbTest(baselineTest, candidateTest, trainOverfitGap);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("passed", passed);
        report.put("testCaseCount", limitedTest.size());
        report.put("trainCaseCount", limitedTrain.size());
        report.put("rawTrainCaseCount", rawTrainCount);
        report.put("rawTestCaseCount", rawTestCount);
        report.put("baseline", Map.of(
                "train", baselineTrain.toMap(),
                "test", baselineTest.toMap()));
        report.put("candidate", Map.of(
                "train", candidateTrain.toMap(),
                "test", candidateTest.toMap()));
        report.put("trainOverfitGap", round(trainOverfitGap));
        report.put("thresholds", Map.of(
                "agreementImprovementPp", AGREEMENT_IMPROVEMENT_THRESHOLD,
                "strictReductionPp", STRICT_REDUCTION_THRESHOLD,
                "lenientReductionPp", LENIENT_REDUCTION_THRESHOLD,
                "maxTrainOverfitGap", TRAIN_OVERFIT_GAP_THRESHOLD));
        return report;
    }

    static boolean passesAbTest(ReplayMetrics baselineTest, ReplayMetrics candidateTest, double trainOverfitGap) {
        if (baselineTest.caseCount() == 0 || candidateTest.caseCount() == 0) {
            return false;
        }
        boolean agreementImproved =
                candidateTest.agreementRate() >= baselineTest.agreementRate() + AGREEMENT_IMPROVEMENT_THRESHOLD;
        boolean strictReduced =
                candidateTest.aiStrictRate() <= baselineTest.aiStrictRate() - STRICT_REDUCTION_THRESHOLD;
        boolean lenientReduced =
                candidateTest.aiLenientRate() <= baselineTest.aiLenientRate() - LENIENT_REDUCTION_THRESHOLD;
        boolean notOverfit = trainOverfitGap <= TRAIN_OVERFIT_GAP_THRESHOLD;
        return agreementImproved && strictReduced && lenientReduced && notOverfit;
    }

    static double computeAgreementRate(List<CaseOutcome> outcomes) {
        if (outcomes.isEmpty()) {
            return 0;
        }
        long agreed = outcomes.stream()
                .filter(o -> AiReviewPromptHealthAggregator.isVerdictAgreed(o.aiVerdict(), o.humanLabel()))
                .count();
        return (double) agreed / outcomes.size();
    }

    static double computeAiStrictRate(List<CaseOutcome> outcomes) {
        if (outcomes.isEmpty()) {
            return 0;
        }
        long strict = outcomes.stream()
                .filter(o -> "REJECT".equalsIgnoreCase(o.aiVerdict()) && "PASS".equalsIgnoreCase(o.humanLabel()))
                .count();
        return (double) strict / outcomes.size();
    }

    static double computeAiLenientRate(List<CaseOutcome> outcomes) {
        if (outcomes.isEmpty()) {
            return 0;
        }
        long lenient = outcomes.stream()
                .filter(o -> "PASS".equalsIgnoreCase(o.aiVerdict())
                        && ("REJECT".equalsIgnoreCase(o.humanLabel()) || "RETURN".equalsIgnoreCase(o.humanLabel())))
                .count();
        return (double) lenient / outcomes.size();
    }

    private ReplayMetrics replaySplit(
            TemplateVersionEntity version,
            List<AiReviewContext.AiReviewDimensionSpec> dimensions,
            String promptTemplate,
            List<AiReviewMisalignmentCaseEntity> cases,
            String splitName,
            Runnable heartbeat) {
        if (cases == null || cases.isEmpty()) {
            return ReplayMetrics.empty();
        }
        List<CaseOutcome> outcomes = new ArrayList<>();
        int total = cases.size();
        for (int index = 0; index < total; index++) {
            AiReviewMisalignmentCaseEntity misCase = cases.get(index);
            try {
                AiReviewContext context = buildContext(version, dimensions, promptTemplate, misCase);
                AiReviewResult result = aiReviewEngine.review(context);
                outcomes.add(new CaseOutcome(misCase.getHumanLabel(), result.verdict()));
            } catch (Exception ex) {
                log.warn(
                        "Offline replay failed split={} progress={}/{} submissionVersionId={}: {}",
                        splitName,
                        index + 1,
                        total,
                        misCase.getSubmissionVersionId(),
                        ex.getMessage());
            }
            touchHeartbeat(heartbeat);
            if ((index + 1) % 2 == 0 || index + 1 == total) {
                log.info("Offline replay progress split={} {}/{}", splitName, index + 1, total);
            }
        }
        return ReplayMetrics.from(outcomes);
    }

    private static void touchHeartbeat(Runnable heartbeat) {
        if (heartbeat == null) {
            return;
        }
        try {
            heartbeat.run();
        } catch (Exception ex) {
            log.debug("Offline replay heartbeat failed: {}", ex.getMessage());
        }
    }

    private AiReviewContext buildContext(
            TemplateVersionEntity version,
            List<AiReviewContext.AiReviewDimensionSpec> dimensions,
            String promptTemplate,
            AiReviewMisalignmentCaseEntity misCase) {
        return new AiReviewContext(
                misCase.getSubmissionId(),
                misCase.getSubmissionVersionId(),
                misCase.getTaskId(),
                null,
                null,
                version.getProviderPlatformKey(),
                version.getModelId(),
                promptTemplate,
                version.getReviewOutputSchemaJson(),
                readMap(misCase.getSubmitDataJson()),
                readMap(misCase.getItemPayloadJson()),
                dimensions,
                List.of());
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse replay JSON: {}", ex.getMessage());
            return Map.of();
        }
    }

    private static List<AiReviewMisalignmentCaseEntity> limitCases(
            List<AiReviewMisalignmentCaseEntity> cases, int max) {
        if (cases == null || cases.isEmpty()) {
            return List.of();
        }
        return cases.size() <= max ? cases : cases.subList(0, max);
    }

    private static double round(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    record CaseOutcome(String humanLabel, String aiVerdict) {
    }

    record ReplayMetrics(int caseCount, double agreementRate, double aiStrictRate, double aiLenientRate) {
        static ReplayMetrics empty() {
            return new ReplayMetrics(0, 0, 0, 0);
        }

        static ReplayMetrics from(List<CaseOutcome> outcomes) {
            return new ReplayMetrics(
                    outcomes.size(),
                    round(computeAgreementRate(outcomes)),
                    round(computeAiStrictRate(outcomes)),
                    round(computeAiLenientRate(outcomes)));
        }

        Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("caseCount", caseCount);
            map.put("testAgreementRate", agreementRate);
            map.put("testAiStrictRate", aiStrictRate);
            map.put("testAiLenientRate", aiLenientRate);
            return map;
        }
    }
}
