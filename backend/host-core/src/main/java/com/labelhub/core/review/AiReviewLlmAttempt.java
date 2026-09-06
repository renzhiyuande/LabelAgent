package com.labelhub.core.review;

import java.math.BigDecimal;

public record AiReviewLlmAttempt(
        int attemptNo,
        String platformKey,
        String modelId,
        String providerRequestId,
        String promptSnapshot,
        String responseSnapshot,
        String errorMessage,
        boolean success,
        Integer latencyMs,
        Integer promptTokens,
        Integer completionTokens,
        Integer totalTokens,
        BigDecimal estimatedCost,
        String traceabilityStatus,
        String historyGapReason) {
}
