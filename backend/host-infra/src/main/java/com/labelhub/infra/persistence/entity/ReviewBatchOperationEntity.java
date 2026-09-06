package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("review_batch_operations")
public class ReviewBatchOperationEntity extends AbstractEntity {
    private String batchKey;
    private Long taskId;
    private Long operatorId;
    private String reviewLevel;
    private String batchAction;
    private String criteriaJson;
    private Integer targetTotalCount;
    private Integer successCount;
    private Integer failedCount;
    private String status;
    private Instant startedAt;
    private Instant finishedAt;
    private String failureSummaryJson;
}
