package com.labelhub.core.review;

import java.math.BigDecimal;

public record AiReviewDimensionResult(
        String dimensionKey,
        String dimensionName,
        BigDecimal score,
        BigDecimal weight,
        String verdict,
        String comment) {
}
