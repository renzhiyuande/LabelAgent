package com.labelhub.infra.business.llm.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class LlmUsageCostEstimatorTest {
    @Test
    void estimateReturnsNullWhenRatesMissing() {
        assertThat(LlmUsageCostEstimator.estimate(100, 50, null, null)).isNull();
    }

    @Test
    void estimateReturnsNullWhenTokensMissing() {
        assertThat(LlmUsageCostEstimator.estimate(null, null, new BigDecimal("0.001"), new BigDecimal("0.002")))
                .isNull();
    }

    @Test
    void estimateComputesInputAndOutputCost() {
        BigDecimal cost = LlmUsageCostEstimator.estimate(
                1000,
                500,
                new BigDecimal("0.001"),
                new BigDecimal("0.002"));

        assertThat(cost).isEqualByComparingTo("0.002000");
    }
}
