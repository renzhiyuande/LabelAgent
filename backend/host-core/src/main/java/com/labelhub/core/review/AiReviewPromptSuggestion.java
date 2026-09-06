package com.labelhub.core.review;

import java.time.Instant;
import java.util.Map;

/**
 * AI 预审提示词优化建议 DTO。
 */
public record AiReviewPromptSuggestion(
        Long id,
        Long templateVersionId,
        Long taskId,
        Long ownerId,
        String baselinePromptTemplate,
        String candidatePromptTemplate,
        String changeSummary,
        Map<String, Object> baselineMetrics,
        Map<String, Object> abTestReport,
        String status,
        Long decidedBy,
        Instant decidedAt,
        String dismissReason,
        Long acceptedTemplateVersionId,
        Instant cooldownUntil,
        Instant createdAt) {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_ACCEPTED = "ACCEPTED";
    public static final String STATUS_DISMISSED = "DISMISSED";
    public static final String STATUS_EXPIRED = "EXPIRED";

    public static final String BIZ_TYPE = "AI_REVIEW_PROMPT_SUGGESTION";
}
