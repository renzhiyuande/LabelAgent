package com.labelhub.infra.business.review.engine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver.LlmCredentials;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PyAgentPromptOptimizeClientTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void buildRequest_allowsNullOptionalLlmFields() {
        PyAgentPromptOptimizeClient client = new PyAgentPromptOptimizeClient(
                "http://localhost:8000", "test-token", objectMapper, null);

        Map<String, Object> request = client.buildRequest(
                "baseline prompt",
                null,
                null,
                List.of(),
                List.of(),
                List.of("raise_ai_human_agreement"));

        assertEquals("baseline prompt", request.get("baselinePromptTemplate"));
        assertFalse(request.containsKey("platformKey"));
        assertFalse(request.containsKey("modelId"));
        assertFalse(request.containsKey("llmBaseUrl"));
        assertFalse(request.containsKey("llmApiKey"));
    }

    @Test
    void buildRequest_injectsLlmCredentialsWhenProviderResolved() {
        AgentLlmCredentialResolver resolver = mock(AgentLlmCredentialResolver.class);
        when(resolver.resolve("deepseek"))
                .thenReturn(Optional.of(new LlmCredentials("https://api.deepseek.com", "sk-test")));
        PyAgentPromptOptimizeClient client = new PyAgentPromptOptimizeClient(
                "http://localhost:8000", "test-token", objectMapper, resolver);

        Map<String, Object> request = client.buildRequest(
                "baseline prompt",
                "deepseek",
                "deepseek-v4-flash",
                List.of(Map.of("key", "accuracy")),
                List.of(Map.of("misalignmentType", "AI_STRICT")),
                List.of("raise_ai_human_agreement"));

        assertEquals("deepseek", request.get("platformKey"));
        assertEquals("deepseek-v4-flash", request.get("modelId"));
        assertEquals("https://api.deepseek.com", request.get("llmBaseUrl"));
        assertEquals("sk-test", request.get("llmApiKey"));
    }

    @Test
    void optimize_rejectsMissingCredentialsWhenPlatformConfigured() {
        PyAgentPromptOptimizeClient client = new PyAgentPromptOptimizeClient(
                "http://localhost:8000", "test-token", objectMapper, null);

        Map<String, Object> request = client.buildRequest(
                "baseline prompt",
                "deepseek",
                "deepseek-v4-flash",
                List.of(),
                List.of(),
                List.of("raise_ai_human_agreement"));

        BusinessException ex = assertThrows(BusinessException.class, () -> client.optimize(request));
        assertEquals("DeepSeek API Key 未配置", ex.getMessage().substring(0, "DeepSeek API Key 未配置".length()));
    }
}
