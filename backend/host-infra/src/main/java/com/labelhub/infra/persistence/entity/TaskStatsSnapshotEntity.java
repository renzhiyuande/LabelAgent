package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("task_stats_snapshot")
public class TaskStatsSnapshotEntity extends AbstractEntity {
    private Long taskId;
    private Integer itemTotalCount;
    private Integer availableCount;
    private Integer claimedCount;
    private Integer inProgressCount;
    private Integer submittedCount;
    private Integer aiReviewingCount;
    private Integer aiRejectedCount;
    private Integer humanReviewingCount;
    private Integer needsRevisionCount;
    private Integer returnedCount;
    private Integer approvedCount;
    private Integer rejectedCount;
    private Integer firstPassCount;
    private Integer exportableCount;
    private Integer exportedCount;
    private Integer activeLabelerCount;
    private Integer activeReviewerCount;
    private BigDecimal avgAiScore;
    private Integer avgReviewDurationSec;
    private Instant lastExportAt;
    private Instant refreshedAt;
}
