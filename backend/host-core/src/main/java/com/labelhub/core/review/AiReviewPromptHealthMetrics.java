package com.labelhub.core.review;

import java.time.Instant;
import java.time.LocalDate;

/**
 * AI 预审提示词健康度聚合指标 DTO。
 */
public record AiReviewPromptHealthMetrics(
        Long id,
        Long templateVersionId,
        Long taskId,
        LocalDate metricDate,
        int windowDays,
        int sampleCount,
        MetricsDetail metrics,
        String healthStatus,
        Instant createdAt) {

    public record MetricsDetail(
            double aiHumanAgreementRate,
            double aiRejectAppealPassRate,
            double aiPassHumanRejectRate,
            double requireHumanRatio) {
    }
}
