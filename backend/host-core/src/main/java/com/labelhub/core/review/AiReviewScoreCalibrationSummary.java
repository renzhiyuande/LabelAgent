package com.labelhub.core.review;

import java.time.Instant;
import java.util.List;

/** 模板维度锚点校准汇总，供 Owner 健康度页展示。 */
public record AiReviewScoreCalibrationSummary(
        int totalReviewCount,
        int calibratedReviewCount,
        int calibrationEventCount,
        List<Entry> recentEntries) {

    public record Entry(
            Long submissionId,
            String dimensionKey,
            String dimensionName,
            Integer rawScore,
            Integer calibratedScore,
            Double anchor,
            Double tolerance,
            Instant analyzedAt) {
    }
}
