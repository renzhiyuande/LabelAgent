package com.labelhub.infra.business.llm.support;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class LlmUsageCostEstimator {
    private static final int COST_SCALE = 6;

    private LlmUsageCostEstimator() {
    }

    public static BigDecimal estimate(
            Integer promptTokens,
            Integer completionTokens,
            BigDecimal costPer1kInputTokens,
            BigDecimal costPer1kOutputTokens) {
        if (costPer1kInputTokens == null && costPer1kOutputTokens == null) {
            return null;
        }
        if (promptTokens == null && completionTokens == null) {
            return null;
        }
        BigDecimal total = BigDecimal.ZERO;
        boolean contributed = false;
        if (promptTokens != null && costPer1kInputTokens != null) {
            total = total.add(BigDecimal.valueOf(promptTokens)
                    .multiply(costPer1kInputTokens)
                    .divide(BigDecimal.valueOf(1000), COST_SCALE, RoundingMode.HALF_UP));
            contributed = true;
        }
        if (completionTokens != null && costPer1kOutputTokens != null) {
            total = total.add(BigDecimal.valueOf(completionTokens)
                    .multiply(costPer1kOutputTokens)
                    .divide(BigDecimal.valueOf(1000), COST_SCALE, RoundingMode.HALF_UP));
            contributed = true;
        }
        return contributed ? total : null;
    }
}
