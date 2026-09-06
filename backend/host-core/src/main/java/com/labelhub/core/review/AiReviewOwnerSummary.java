package com.labelhub.core.review;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Owner 侧查看 AI 审核结果的摘要 DTO。
 * 仅暴露审核结果各维度分数、总体判定与摘要，不含 Prompt/原始响应等内部信息。
 */
public record AiReviewOwnerSummary(
        String status,
        String verdict,
        BigDecimal totalScore,
        String summary,
        String failureReason,
        String modelId,
        Instant analyzedAt,
        List<DimensionScore> dimensions) {

    public record DimensionScore(
            String dimensionKey,
            String dimensionName,
            BigDecimal score,
            BigDecimal maxScore,
            BigDecimal weight,
            String verdict,
            String comment) {
    }
}
