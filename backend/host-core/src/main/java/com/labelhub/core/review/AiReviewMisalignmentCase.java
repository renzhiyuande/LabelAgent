package com.labelhub.core.review;

import java.time.Instant;

/**
 * AI–人工不一致样本 DTO，用于提示词优化训练/评估集。
 */
public record AiReviewMisalignmentCase(
        Long id,
        Long templateVersionId,
        Long taskId,
        Long submissionId,
        Long submissionVersionId,
        Long aiReviewId,
        String aiVerdict,
        String humanLabel,
        String misalignmentType,
        Long appealId,
        String itemPayloadJson,
        String submitDataJson,
        String aiSummaryText,
        String aiDimensionScoresJson,
        String humanCommentText,
        String splitTag,
        Instant createdAt) {
}
