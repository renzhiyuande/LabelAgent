package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("submission_appeals")
public class SubmissionAppealEntity extends AbstractEntity {
    private Long submissionId;
    private Long assignmentId;
    private Long taskId;
    private Long labelerId;
    private Long ownerId;
    private Integer appealNo;
    private String status;
    private String reasonText;
    private String decisionReasonText;
    private Long decidedBy;
    private Instant decidedAt;
    private String batchKey;
    private String extJson;
}
