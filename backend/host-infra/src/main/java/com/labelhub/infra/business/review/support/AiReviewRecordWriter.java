package com.labelhub.infra.business.review.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.review.AiReviewDimensionResult;
import com.labelhub.core.review.AiReviewLlmAttempt;
import com.labelhub.core.review.AiReviewResult;
import com.labelhub.infra.persistence.entity.AiReviewDimensionScoreEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.mapper.AiReviewDimensionScoreMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewRecordWriter {
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper;
    private final AiReviewLlmAttemptWriter aiReviewLlmAttemptWriter;
    private final ObjectMapper objectMapper;

    public AiReviewRecordWriter(
            AiReviewRecordMapper aiReviewRecordMapper,
            AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper,
            AiReviewLlmAttemptWriter aiReviewLlmAttemptWriter,
            ObjectMapper objectMapper) {
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.aiReviewDimensionScoreMapper = aiReviewDimensionScoreMapper;
        this.aiReviewLlmAttemptWriter = aiReviewLlmAttemptWriter;
        this.objectMapper = objectMapper;
    }

    public AiReviewRecordEntity writeSuccess(
            Long submissionId,
            Long submissionVersionId,
            Long taskId,
            Long assignmentId,
            Integer reviewRoundNo,
            int retryNo,
            Long asyncTaskId,
            String outputSchemaJson,
            AiReviewResult result) {
        Instant startedAt = Instant.now();
        Instant finishedAt = startedAt;
        AiReviewRecordEntity record = new AiReviewRecordEntity();
        record.setSubmissionId(submissionId);
        record.setSubmissionVersionId(submissionVersionId);
        record.setTaskId(taskId);
        record.setAssignmentId(assignmentId);
        record.setReviewRoundNo(reviewRoundNo == null ? 1 : reviewRoundNo);
        record.setPlatformKey(result.platformKey());
        record.setModelId(result.modelId());
        record.setAsyncTaskId(asyncTaskId);
        record.setProviderRequestId(result.providerRequestId());
        record.setPromptSnapshot(result.promptSnapshot());
        record.setInputSnapshotJson(writeJson(result.inputSnapshot()));
        record.setOutputSchemaSnapshotJson(outputSchemaJson);
        record.setParsedResultJson(writeJson(result.parsedResult()));
        record.setRawResponseText(result.rawResponseText());
        record.setVerdict(result.verdict());
        record.setTotalScore(result.totalScore());
        record.setSummaryText(result.summary());
        record.setRetryNo(retryNo);
        record.setStatus("SUCCESS");
        record.setManualRetryFlag(0);
        record.setDeadLetterFlag(0);
        record.setFallbackTargetStatus(mapFallbackStatus(result.verdict()));
        applyTelemetry(record, result);
        record.setStartedAt(startedAt);
        record.setFinishedAt(finishedAt);
        record.setCreatedAt(startedAt);
        record.setUpdatedAt(finishedAt);
        aiReviewRecordMapper.insert(record);

        List<AiReviewLlmAttempt> attempts = result.llmAttempts();
        if (attempts != null && !attempts.isEmpty()) {
            aiReviewLlmAttemptWriter.writeAttempts(
                    record.getId(),
                    submissionId,
                    submissionVersionId,
                    taskId,
                    result.platformKey(),
                    result.modelId(),
                    attempts,
                    startedAt);
        }

        int sortNo = 0;
        for (AiReviewDimensionResult dimension : result.dimensions()) {
            AiReviewDimensionScoreEntity score = new AiReviewDimensionScoreEntity();
            score.setAiReviewId(record.getId());
            score.setDimensionKey(dimension.dimensionKey());
            score.setDimensionName(dimension.dimensionName());
            score.setScore(dimension.score());
            score.setWeight(dimension.weight());
            score.setVerdict(dimension.verdict());
            score.setCommentText(dimension.comment());
            score.setSortNo(++sortNo);
            score.setCreatedAt(finishedAt);
            score.setUpdatedAt(finishedAt);
            aiReviewDimensionScoreMapper.insert(score);
        }
        return record;
    }

    public AiReviewRecordEntity writeFailure(
            Long submissionId,
            Long submissionVersionId,
            Long taskId,
            Long assignmentId,
            Integer reviewRoundNo,
            int retryNo,
            Long asyncTaskId,
            String platformKey,
            String modelId,
            String outputSchemaJson,
            String failureReason) {
        Instant now = Instant.now();
        AiReviewRecordEntity record = new AiReviewRecordEntity();
        record.setSubmissionId(submissionId);
        record.setSubmissionVersionId(submissionVersionId);
        record.setTaskId(taskId);
        record.setAssignmentId(assignmentId);
        record.setReviewRoundNo(reviewRoundNo == null ? 1 : reviewRoundNo);
        record.setPlatformKey(platformKey == null ? "unknown" : platformKey);
        record.setModelId(modelId == null ? "unknown" : modelId);
        record.setAsyncTaskId(asyncTaskId);
        record.setOutputSchemaSnapshotJson(outputSchemaJson);
        record.setVerdict("ERROR");
        record.setRetryNo(retryNo);
        record.setStatus("FAILED");
        record.setFailureReason(truncate(failureReason, 500));
        record.setManualRetryFlag(0);
        record.setDeadLetterFlag(0);
        record.setErrorCode("ENGINE_FAILED");
        record.setTraceabilityStatus("FULL");
        record.setAttemptCount(retryNo + 1);
        record.setStartedAt(now);
        record.setFinishedAt(now);
        record.setCreatedAt(now);
        record.setUpdatedAt(now);
        aiReviewRecordMapper.insert(record);
        return record;
    }

    private void applyTelemetry(AiReviewRecordEntity record, AiReviewResult result) {
        record.setTotalLatencyMs(result.totalLatencyMs());
        record.setAttemptCount(result.attemptCount());
        record.setPromptTokens(result.promptTokens());
        record.setCompletionTokens(result.completionTokens());
        record.setTotalTokens(result.totalTokens());
        record.setTraceabilityStatus("FULL");
        record.setHistoryGapReason(null);
    }

    private static String mapFallbackStatus(String verdict) {
        return switch (verdict == null ? "" : verdict.toUpperCase()) {
            case "PASS" -> "AI_PASSED";
            case "REJECT" -> "AI_REJECTED";
            default -> "HUMAN_REVIEWING";
        };
    }

    private String writeJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload == null ? Map.of() : payload);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private static String truncate(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }
}
