package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("ai_review_records")
public class AiReviewRecordEntity extends AbstractEntity {
    private Long submissionId;
    private Long submissionVersionId;
    private Long taskId;
    private Long assignmentId;
    private Integer reviewRoundNo;
    private String platformKey;
    private String modelId;
    private Long asyncTaskId;
    private String providerRequestId;
    private String promptSnapshot;
    private String inputSnapshotJson;
    private String outputSchemaSnapshotJson;
    private String parsedResultJson;
    private String rawResponseText;
    private String verdict;
    private BigDecimal totalScore;
    private String summaryText;
    private Integer retryNo;
    private String status;
    private String failureReason;
    private Integer manualRetryFlag;
    private Integer deadLetterFlag;
    private String fallbackTargetStatus;
    private Instant startedAt;
    private Instant finishedAt;
    private Integer totalLatencyMs;
    private Integer attemptCount;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private String errorCode;
    private String traceabilityStatus;
    private String historyGapReason;
}
