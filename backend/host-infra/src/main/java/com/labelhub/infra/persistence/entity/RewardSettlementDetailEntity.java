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
@TableName("reward_settlement_details")
public class RewardSettlementDetailEntity extends AbstractEntity {
    private Long batchId;
    private Long taskId;
    private Long userId;
    private Long submissionId;
    private Long submissionVersionId;
    private Long assignmentId;
    private String currencyCode;
    private BigDecimal amount;
    private String status;
    private BigDecimal qualityScore;
    private String rewardReason;
    private String calcBasisJson;
    private Instant effectiveAt;
    private Instant settledAt;
    private Instant reversedAt;
}
