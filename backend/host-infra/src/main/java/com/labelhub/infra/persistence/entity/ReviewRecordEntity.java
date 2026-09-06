package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("review_records")
public class ReviewRecordEntity extends AbstractEntity {
    private Long submissionId;
    private Long submissionVersionId;
    private Long taskId;
    private Long assignmentId;
    private Long reviewerId;
    private String reviewLevel;
    private Integer reviewStageNo;
    private String reviewNodeCode;
    private String action;
    private String fromStatus;
    private String toStatus;
    private String reviewBatchKey;
    private String nextReviewLevel;
    private Integer isFinalDecision;
    private String commentText;
    private String diffJson;
    private Instant decidedAt;
}
