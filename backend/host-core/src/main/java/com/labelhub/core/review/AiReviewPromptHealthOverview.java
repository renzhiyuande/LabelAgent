package com.labelhub.core.review;

import java.util.List;

/**
 * Owner 侧 AI 预审健康度总览，含最新指标与近 7 日趋势。
 */
public record AiReviewPromptHealthOverview(
        Long templateId,
        Long templateVersionId,
        AiReviewPromptHealthAggregationScope aggregationScope,
        AiReviewPromptHealthMetrics latest,
        List<AiReviewPromptHealthMetrics> trendLast7Days,
        AiReviewScoreCalibrationSummary scoreCalibrationSummary) {
}
