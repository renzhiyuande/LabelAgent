package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("task_acceptance_samples")
public class TaskAcceptanceSampleEntity extends AbstractEntity {
    private Long acceptanceId;
    private Long taskId;
    private Long submissionId;
    private Long submissionVersionId;
    private Long assignmentId;
    private Long labelerId;
    private Long reviewerId;
    private String sampleSource;
    private String sampleStatus;
    private String ownerDecision;
    private String ownerCommentText;
    private Instant checkedAt;
}
