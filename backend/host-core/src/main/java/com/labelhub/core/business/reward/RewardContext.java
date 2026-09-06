package com.labelhub.core.business.reward;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 单条提交的奖励计算上下文。由结算服务在扫描 APPROVED 提交时构造。
 */
public record RewardContext(
        Long taskId,
        Long userId,
        Long submissionId,
        Long submissionVersionId,
        BigDecimal qualityScore,
        Map<String, Object> rewardRule) {
}
