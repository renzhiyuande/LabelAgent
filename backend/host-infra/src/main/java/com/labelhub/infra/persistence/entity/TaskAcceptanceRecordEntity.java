package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("task_acceptance_records")
public class TaskAcceptanceRecordEntity extends AbstractEntity {
    private Long taskId;
    private String acceptanceType;
    private Long acceptedBy;
    private String status;
    private String sampleRuleJson;
    private String targetScopeJson;
    private Integer sampleTotalCount;
    private Integer sampledCount;
    private Integer passCount;
    private Integer failedCount;
    private String commentText;
    private Instant confirmedAt;
    private Instant reopenedAt;
    private Instant archivedAt;
}
