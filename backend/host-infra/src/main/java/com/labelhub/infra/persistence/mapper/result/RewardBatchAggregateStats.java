package com.labelhub.infra.persistence.mapper.result;

import java.math.BigDecimal;

public record RewardBatchAggregateStats(
        Long effectiveTotalCount,
        Long userTotalCount,
        BigDecimal totalAmount) {
}
