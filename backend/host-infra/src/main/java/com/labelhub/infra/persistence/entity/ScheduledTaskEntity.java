package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("scheduled_tasks")
public class ScheduledTaskEntity extends AbstractEntity {
    private String taskName;
    private String taskType;
    private String cronExpr;
    private String payloadJson;
    private String bizType;
    private Long bizId;
    private Integer priority;
    private Integer maxRetryCount;
    private Integer enabled;
    private Instant lastTriggeredAt;
    private Instant nextTriggerAt;
    private Integer totalTriggerCount;
    private String description;
}
