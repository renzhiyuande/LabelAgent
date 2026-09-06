package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@TableName("async_tasks")
public class AsyncTaskEntity extends AbstractEntity {
    private String taskType;
    private String bizType;
    private Long bizId;
    private String bizKey;
    private Integer priority;
    private String status;
    private String payloadJson;
    private Integer retryCount;
    private Integer maxRetryCount;
    private Integer manualRetryCount;
    private Instant nextRunAt;
    private String workerId;
    private Instant lockedAt;
    private Instant startedAt;
    private Instant finishedAt;
    private Instant canceledAt;
    private Instant deadLetteredAt;
    private String lastErrorCode;
    private String lastErrorMessage;
}
