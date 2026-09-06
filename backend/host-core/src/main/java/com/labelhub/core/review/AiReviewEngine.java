package com.labelhub.core.review;

/**
 * AI 审核引擎 SPI：由 Mock 或 PyAgent 实现，主业务只依赖本契约。
 */
public interface AiReviewEngine {
    AiReviewResult review(AiReviewContext context);
}
