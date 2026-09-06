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
@TableName("user_stats_daily")
public class UserStatsDailyEntity extends AbstractEntity {
    private Long userId;
    private String roleCode;
    private Long taskId;
    private LocalDate statDate;
    private Integer claimCount;
    private Integer submitCount;
    private Integer draftSaveCount;
    private Integer approveCount;
    private Integer rejectCount;
    private Integer returnCount;
    private Integer llmAssistCount;
    private Integer avgSubmitLatencySec;
    private Integer avgReviewLatencySec;
    private BigDecimal qualityScoreAvg;
    private BigDecimal rewardAmount;
    private BigDecimal settledRewardAmount;
}
