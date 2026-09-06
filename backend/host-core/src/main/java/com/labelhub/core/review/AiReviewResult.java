package com.labelhub.core.review;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record AiReviewResult(
        String platformKey,
        String modelId,
        String verdict,
        BigDecimal totalScore,
        String summary,
        String promptSnapshot,
        Map<String, Object> inputSnapshot,
        Map<String, Object> parsedResult,
        String rawResponseText,
        String providerRequestId,
        List<AiReviewDimensionResult> dimensions,
        Integer totalLatencyMs,
        Integer attemptCount,
        Integer promptTokens,
        Integer completionTokens,
        Integer totalTokens,
        List<AiReviewLlmAttempt> llmAttempts) {
    public AiReviewResult(
            String platformKey,
            String modelId,
            String verdict,
            BigDecimal totalScore,
            String summary,
            String promptSnapshot,
            Map<String, Object> inputSnapshot,
            Map<String, Object> parsedResult,
            String rawResponseText,
            String providerRequestId,
            List<AiReviewDimensionResult> dimensions) {
        this(
                platformKey,
                modelId,
                verdict,
                totalScore,
                summary,
                promptSnapshot,
                inputSnapshot,
                parsedResult,
                rawResponseText,
                providerRequestId,
                dimensions,
                null,
                null,
                null,
                null,
                null,
                null);
    }
}
