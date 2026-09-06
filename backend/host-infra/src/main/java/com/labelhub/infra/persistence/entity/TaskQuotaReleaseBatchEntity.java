package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("task_quota_release_batches")
public class TaskQuotaReleaseBatchEntity extends AbstractEntity {
    private Long taskId;
    private String batchNo;
    private Integer releaseCount;
    private Long releasedBy;
    private Instant releasedAt;
    private String status;
    private String remark;
}
