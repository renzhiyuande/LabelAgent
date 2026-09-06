package com.labelhub.infra.business.review.support;

import com.labelhub.core.review.AiReviewLlmAttempt;
import com.labelhub.infra.persistence.entity.AiReviewLlmAttemptEntity;
import com.labelhub.infra.persistence.mapper.AiReviewLlmAttemptMapper;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewLlmAttemptWriter {
    private final AiReviewLlmAttemptMapper aiReviewLlmAttemptMapper;

    public AiReviewLlmAttemptWriter(AiReviewLlmAttemptMapper aiReviewLlmAttemptMapper) {
        this.aiReviewLlmAttemptMapper = aiReviewLlmAttemptMapper;
    }

    public void writeAttempts(
            Long aiReviewId,
            Long submissionId,
            Long submissionVersionId,
            Long taskId,
            String platformKey,
            String modelId,
            List<AiReviewLlmAttempt> attempts,
            Instant startedAt) {
        if (attempts == null || attempts.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        for (AiReviewLlmAttempt attempt : attempts) {
            AiReviewLlmAttemptEntity entity = new AiReviewLlmAttemptEntity();
            entity.setAiReviewId(aiReviewId);
            entity.setSubmissionId(submissionId);
            entity.setSubmissionVersionId(submissionVersionId);
            entity.setTaskId(taskId);
            entity.setAttemptNo(attempt.attemptNo());
            entity.setPlatformKey(StringUtils.hasText(attempt.platformKey()) ? attempt.platformKey() : platformKey);
            entity.setModelId(StringUtils.hasText(attempt.modelId()) ? attempt.modelId() : modelId);
            entity.setProviderRequestId(attempt.providerRequestId());
            entity.setPromptSnapshot(attempt.promptSnapshot());
            entity.setResponseSnapshot(attempt.responseSnapshot());
            entity.setErrorMessage(truncate(attempt.errorMessage(), 500));
            entity.setSuccessFlag(attempt.success() ? 1 : 0);
            entity.setLatencyMs(attempt.latencyMs());
            entity.setPromptTokens(attempt.promptTokens());
            entity.setCompletionTokens(attempt.completionTokens());
            entity.setTotalTokens(attempt.totalTokens());
            entity.setHistoryBackfillFlag(0);
            entity.setTraceabilityStatus(
                    StringUtils.hasText(attempt.traceabilityStatus()) ? attempt.traceabilityStatus() : "FULL");
            entity.setHistoryGapReason(attempt.historyGapReason());
            entity.setStartedAt(startedAt);
            entity.setFinishedAt(now);
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            aiReviewLlmAttemptMapper.insert(entity);
        }
    }

    private static String truncate(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }
}
