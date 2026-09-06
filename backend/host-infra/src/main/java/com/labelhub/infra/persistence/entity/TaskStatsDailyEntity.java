package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("task_stats_daily")
public class TaskStatsDailyEntity extends AbstractEntity {
    private Long taskId;
    private LocalDate statDate;
    private Integer claimCount;
    private Integer submitCount;
    private Integer revisionCount;
    private Integer aiRejectCount;
    private Integer approveCount;
    private Integer rejectCount;
    private Integer returnCount;
    private Integer firstPassCount;
    private Integer exportCount;
    private Integer activeLabelerCount;
    private Integer activeReviewerCount;
    private BigDecimal avgAiScore;
    private Integer avgCycleTimeSec;
}
