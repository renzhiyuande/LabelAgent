package com.labelhub.infra.business.review.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.labelhub.core.review.AiReviewContext;
import com.labelhub.core.review.AiReviewResult;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MockAiReviewEngineTest {
    private final MockAiReviewEngine engine = new MockAiReviewEngine();

    @Test
    void review_isDeterministicForSameSubmission() {
        AiReviewContext context = sampleContext(1001L, 2001L);
        AiReviewResult first = engine.review(context);
        AiReviewResult second = engine.review(context);

        assertEquals(first.verdict(), second.verdict());
        assertEquals(first.totalScore(), second.totalScore());
        assertEquals(first.dimensions().size(), second.dimensions().size());
    }

    @Test
    void review_writesFullDimensionResults() {
        AiReviewResult result = engine.review(sampleContext(1002L, 2002L));

        assertNotNull(result.totalScore());
        assertFalse(result.dimensions().isEmpty());
        assertNotNull(result.summary());
        assertNotNull(result.parsedResult());
        assertEquals("mock", result.platformKey());
    }

    private AiReviewContext sampleContext(Long submissionId, Long versionId) {
        return new AiReviewContext(
                submissionId,
                versionId,
                1L,
                2L,
                1,
                "mock",
                "mock-engine",
                "Review prompt",
                "{}",
                Map.of("answer", "sample"),
                Map.of("prompt", "question"),
                List.of(new AiReviewContext.AiReviewDimensionSpec(
                        "ACCURACY",
                        "准确性",
                        BigDecimal.valueOf(40),
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(100),
                        BigDecimal.valueOf(80),
                        BigDecimal.valueOf(40),
                        "Check accuracy")),
                List.of());
    }
}
