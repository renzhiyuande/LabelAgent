package com.labelhub.core.review;

import com.labelhub.core.api.PageResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class AiReviewObservabilityDtos {
    private AiReviewObservabilityDtos() {
    }

    public record AiReviewObservabilitySummary(
            long queuePending,
            long queueRunning,
            long reviewsLastHour,
            long reviewsLast24Hours,
            long failedLast24Hours,
            double failureRateLast24Hours,
            double avgLatencyMsLast24Hours,
            long totalTokensLast24Hours,
            BigDecimal estimatedCostLast24Hours,
            long attentionCount,
            Instant refreshedAt) {
    }

    public record AiReviewThroughputPoint(
            String bucketStart,
            long completedCount,
            long failedCount,
            double avgLatencyMs) {
    }

    public record AiReviewModelBucket(
            String platformKey,
            String modelId,
            long count,
            long failedCount,
            double avgLatencyMs) {
    }

    public record AiReviewTopKItem(
            Long aiReviewId,
            Long submissionId,
            Long taskId,
            String taskTitle,
            String taskCode,
            String modelId,
            String status,
            String verdict,
            Integer attemptCount,
            Integer totalLatencyMs,
            Integer totalTokens,
            Integer promptTokens,
            Integer completionTokens,
            BigDecimal estimatedCost,
            String traceabilityStatus,
            Instant startedAt,
            Instant finishedAt,
            String failureReason) {
    }

    public record AiReviewObservabilityOverview(
            AiReviewObservabilitySummary summary,
            List<AiReviewThroughputPoint> throughputTrend,
            List<AiReviewModelBucket> modelDistribution,
            List<AiReviewTopKItem> topSlow,
            List<AiReviewTopKItem> topFailed,
            List<AiReviewTopKItem> topRetry) {
    }

    public record AiReviewObservabilityRecordSummary(
            Long id,
            Long submissionId,
            Long submissionVersionId,
            Long taskId,
            String taskTitle,
            String taskCode,
            String platformKey,
            String modelId,
            String status,
            String verdict,
            Integer attemptCount,
            Integer totalLatencyMs,
            Integer totalTokens,
            Integer promptTokens,
            Integer completionTokens,
            BigDecimal estimatedCost,
            String traceabilityStatus,
            String historyGapReason,
            Instant startedAt,
            Instant finishedAt,
            String failureReason) {
    }

    public record AiReviewTimelineEntry(
            String phase,
            String status,
            String detail,
            Instant occurredAt,
            String traceabilityStatus) {
    }

    public record AiReviewObservabilityRecordDetail(
            AiReviewObservabilityRecordSummary summary,
            List<AiReviewLlmAttempt> attempts,
            List<AiReviewTimelineEntry> timeline,
            String promptSnapshot,
            String rawResponseText) {
    }

    public record AiReviewObservabilityRecordPage(
            PageResponse<AiReviewObservabilityRecordSummary> page) {
    }
}
