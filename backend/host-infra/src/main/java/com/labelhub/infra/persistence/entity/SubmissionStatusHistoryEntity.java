package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("submission_status_histories")
public class SubmissionStatusHistoryEntity extends AbstractEntity {
    private Long submissionId;
    private Long submissionVersionId;
    private Long taskId;
    private Long assignmentId;
    private Integer roundNo;
    private String fromStatus;
    private String toStatus;
    private String actionCode;
    private String operatorType;
    private Long operatorId;
    private String reviewLevel;
    private String batchOperationKey;
    private String reasonCode;
    private String reasonText;
    private Long relatedAiReviewId;
    private Long relatedReviewRecordId;
    private String requestId;
    private String idempotencyKey;
    private Instant occurredAt;
}
