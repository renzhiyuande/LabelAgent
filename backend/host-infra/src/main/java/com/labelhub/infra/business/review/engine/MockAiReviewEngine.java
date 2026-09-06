package com.labelhub.infra.business.review.engine;

import com.labelhub.core.review.AiReviewContext;
import com.labelhub.core.review.AiReviewDimensionResult;
import com.labelhub.core.review.AiReviewEngine;
import com.labelhub.core.review.AiReviewResult;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 确定性 Mock 引擎：基于 submissionId / versionId 哈希生成可复现评分。
 */
@Component
@ConditionalOnProperty(name = "labelhub.review.ai-engine", havingValue = "mock", matchIfMissing = true)
public class MockAiReviewEngine implements AiReviewEngine {
    @Override
    public AiReviewResult review(AiReviewContext context) {
        long seed = context.submissionId() ^ context.submissionVersionId();
        List<AiReviewDimensionResult> dimensions = new ArrayList<>();
        BigDecimal weightedTotal = BigDecimal.ZERO;
        BigDecimal weightSum = BigDecimal.ZERO;
        int index = 0;
        for (AiReviewContext.AiReviewDimensionSpec spec : context.dimensions()) {
            index++;
            long dimSeed = seed ^ spec.dimensionKey().hashCode() ^ index;
            BigDecimal min = spec.scoreMin() == null ? BigDecimal.ZERO : spec.scoreMin();
            BigDecimal max = spec.scoreMax() == null ? BigDecimal.valueOf(100) : spec.scoreMax();
            BigDecimal span = max.subtract(min);
            if (span.compareTo(BigDecimal.ZERO) <= 0) {
                span = BigDecimal.valueOf(100);
            }
            BigDecimal score = min.add(span.multiply(BigDecimal.valueOf(Math.abs(dimSeed % 100) / 100.0)))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal weight = spec.weight() == null ? BigDecimal.ONE : spec.weight();
            weightedTotal = weightedTotal.add(score.multiply(weight));
            weightSum = weightSum.add(weight);
            String verdict = resolveDimensionVerdict(score, spec.passThreshold(), spec.rejectThreshold());
            dimensions.add(new AiReviewDimensionResult(
                    spec.dimensionKey(),
                    spec.dimensionName(),
                    score,
                    weight,
                    verdict,
                    "Mock score for " + spec.dimensionKey()));
        }
        BigDecimal totalScore = weightSum.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.valueOf(Math.abs(seed % 100))
                : weightedTotal.divide(weightSum, 2, RoundingMode.HALF_UP);
        String verdict = resolveOverallVerdict(totalScore, seed);
        Map<String, Object> parsed = new HashMap<>();
        parsed.put("verdict", verdict);
        parsed.put("totalScore", totalScore);
        parsed.put("summary", "Mock AI review for submission " + context.submissionId());
        parsed.put("dimensions", dimensions.stream().map(d -> Map.of(
                "dimensionKey", d.dimensionKey(),
                "score", d.score(),
                "comment", d.comment())).toList());
        Map<String, Object> inputSnapshot = new HashMap<>();
        inputSnapshot.put("submitData", context.submitData());
        inputSnapshot.put("itemPayload", context.itemPayload());
        return new AiReviewResult(
                context.platformKey() == null || context.platformKey().isBlank() ? "mock" : context.platformKey(),
                context.modelId() == null || context.modelId().isBlank() ? "mock-engine" : context.modelId(),
                verdict,
                totalScore,
                "Mock AI review for submission " + context.submissionId(),
                context.promptTemplate(),
                inputSnapshot,
                parsed,
                parsed.toString(),
                "mock-" + UUID.randomUUID(),
                dimensions);
    }

    private static String resolveOverallVerdict(BigDecimal totalScore, long seed) {
        if (totalScore.compareTo(BigDecimal.valueOf(85)) >= 0) {
            return "PASS";
        }
        if (totalScore.compareTo(BigDecimal.valueOf(55)) <= 0 || seed % 17 == 0) {
            return "REJECT";
        }
        return "REQUIRE_HUMAN";
    }

    private static String resolveDimensionVerdict(BigDecimal score, BigDecimal passThreshold, BigDecimal rejectThreshold) {
        if (passThreshold != null && score.compareTo(passThreshold) >= 0) {
            return "PASS";
        }
        if (rejectThreshold != null && score.compareTo(rejectThreshold) <= 0) {
            return "REJECT";
        }
        return "REQUIRE_HUMAN";
    }
}
