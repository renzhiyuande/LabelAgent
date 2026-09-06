package com.labelhub.infra.business.review.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.review.AiReviewContext;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver.LlmCredentials;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PyAgentAiReviewEngineTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void buildRequest_allowsNullOptionalFields() {
        PyAgentAiReviewEngine engine = new PyAgentAiReviewEngine(
                "http://localhost:8000", "test-token", objectMapper, null);
        Map<String, Object> request = engine.buildRequest(sampleContext(null, null, null));

        assertEquals(1001L, request.get("submissionId"));
        assertFalse(request.containsKey("platformKey"));
        assertFalse(request.containsKey("modelId"));
        assertFalse(request.containsKey("promptTemplate"));
        assertFalse(request.containsKey("llmBaseUrl"));
    }

    @Test
    void buildRequest_injectsLlmCredentialsWhenProviderResolved() {
        AgentLlmCredentialResolver resolver = mock(AgentLlmCredentialResolver.class);
        when(resolver.resolve("openai"))
                .thenReturn(Optional.of(new LlmCredentials("https://api.openai.com/v1", "sk-test")));
        PyAgentAiReviewEngine engine = new PyAgentAiReviewEngine(
                "http://localhost:8000", "test-token", objectMapper, resolver);

        Map<String, Object> request = engine.buildRequest(sampleContext("openai", "gpt-4.1-mini", "Review prompt"));

        assertEquals("openai", request.get("platformKey"));
        assertEquals("gpt-4.1-mini", request.get("modelId"));
        assertEquals("https://api.openai.com/v1", request.get("llmBaseUrl"));
        assertEquals("sk-test", request.get("llmApiKey"));
        assertEquals(1, ((List<?>) request.get("dimensions")).size());
    }

    @Test
    void buildRequest_serializesDimensions() throws Exception {
        PyAgentAiReviewEngine engine = new PyAgentAiReviewEngine(
                "http://localhost:8000", "test-token", objectMapper, null);
        Map<String, Object> request = engine.buildRequest(sampleContext("mock", "mock-model", "prompt"));
        String json = objectMapper.writeValueAsString(request);
        assertTrue(json.contains("dimensionKey"));
        assertTrue(json.contains("准确性"));
    }

    @Test
    void buildRequest_includesMemoryContextWhenPresent() {
        PyAgentAiReviewEngine engine = new PyAgentAiReviewEngine(
                "http://localhost:8000", "test-token", objectMapper, null);

        Map<String, Object> request = engine.buildRequest(sampleContextWithMemory());

        assertTrue(request.containsKey("memoryContext"));
        assertEquals(1, ((List<?>) request.get("memoryContext")).size());
    }

    private AiReviewContext sampleContext(String platformKey, String modelId, String promptTemplate) {
        return new AiReviewContext(
                1001L,
                2002L,
                3003L,
                4004L,
                1,
                platformKey,
                modelId,
                promptTemplate,
                "{}",
                Map.of("choice", "A"),
                Map.of("prompt", "question"),
                List.of(new AiReviewContext.AiReviewDimensionSpec(
                        "accuracy",
                        "准确性",
                        BigDecimal.ONE,
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(100),
                        BigDecimal.valueOf(70),
                        BigDecimal.valueOf(40),
                        "Check accuracy")),
                List.of());
    }

    private AiReviewContext sampleContextWithMemory() {
        return new AiReviewContext(
                1001L,
                2002L,
                3003L,
                4004L,
                1,
                "mock",
                "mock-model",
                "prompt",
                "{}",
                Map.of("choice", "A"),
                Map.of("prompt", "question"),
                List.of(new AiReviewContext.AiReviewDimensionSpec(
                        "accuracy",
                        "准确性",
                        BigDecimal.ONE,
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(100),
                        BigDecimal.valueOf(70),
                        BigDecimal.valueOf(40),
                        "Check accuracy")),
                List.of(Map.of(
                        "caseId", "submission:9001",
                        "humanDecision", "approve",
                        "humanComment", "判断准确")));
    }
}
