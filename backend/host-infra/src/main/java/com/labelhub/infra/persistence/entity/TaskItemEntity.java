package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("task_items")
public class TaskItemEntity extends AbstractEntity {
    private Long taskId;
    private Long importBatchId;
    private Integer seqNo;
    private String sourceItemKey;
    private String payloadJson;
    private String payloadHash;
    private String itemStatus;
    private Integer difficultyLevel;
    private Integer currentAssignmentCount;
    private Integer currentApprovedCount;
    private Integer acceptanceSampledFlag;
    private String disabledReason;
    private Instant lastAcceptedAt;
}
