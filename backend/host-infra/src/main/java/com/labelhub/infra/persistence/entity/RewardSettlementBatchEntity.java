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
@TableName("reward_settlement_batches")
public class RewardSettlementBatchEntity extends AbstractEntity {
    private Long taskId;
    private String batchNo;
    private String status;
    private String settleScope;
    private String currencyCode;
    private String rewardRuleSnapshotJson;
    private Integer targetTotalCount;
    private Integer effectiveTotalCount;
    private Integer userTotalCount;
    private BigDecimal totalAmount;
    private Long confirmedBy;
    private Instant confirmedAt;
    private Instant paidAt;
    private Instant reversedAt;
    private Long exportFileId;
    private String remark;
}
