package com.labelhub.infra.business.review.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.review.PromptOptimizeResult;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver;
import com.labelhub.infra.business.llm.agent.AgentLlmCredentialResolver.LlmCredentials;
import com.labelhub.infra.business.llm.agent.AgentRestClientSupport;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * 通过 REST 契约调用 Python Agent Prompt Optimizer。
 */
@Component
@ConditionalOnProperty(name = "labelhub.review.ai-engine", havingValue = "pyagent")
public class PyAgentPromptOptimizeClient {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String internalToken;
    private final Optional<AgentLlmCredentialResolver> credentialResolver;

    public PyAgentPromptOptimizeClient(
            @Value("${labelhub.agent.base-url:http://localhost:8000}") String agentBaseUrl,
            @Value("${labelhub.internal-token}") String internalToken,
            ObjectMapper objectMapper,
            @Autowired(required = false) AgentLlmCredentialResolver credentialResolver) {
        this.restClient = AgentRestClientSupport.create(agentBaseUrl);
        this.internalToken = internalToken;
        this.objectMapper = objectMapper;
        this.credentialResolver = Optional.ofNullable(credentialResolver);
    }

    public PromptOptimizeResult optimize(Map<String, Object> request) {
        requireResolvedCredentials(request);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/v1/prompt-optimize")
                    .header("X-Internal-Token", internalToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(AgentRestClientSupport.toJsonBody(objectMapper, request))
                    .retrieve()
                    .body(Map.class);
            if (response == null) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "PyAgent returned empty prompt-optimize response");
            }
            return objectMapper.convertValue(response, PromptOptimizeResult.class);
        } catch (BusinessException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            throw new BusinessException(
                    ErrorCode.SYSTEM_ERROR,
                    "PyAgent prompt-optimize failed: HTTP "
                            + ex.getStatusCode().value()
                            + " "
                            + ex.getResponseBodyAsString());
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "PyAgent prompt-optimize failed: " + ex.getMessage());
        }
    }

    public Map<String, Object> buildRequest(
            String baselinePromptTemplate,
            String platformKey,
            String modelId,
            List<Map<String, Object>> dimensions,
            List<Map<String, Object>> misalignmentCases,
            List<String> optimizationGoals) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("baselinePromptTemplate", baselinePromptTemplate);
        request.put("dimensions", dimensions != null ? dimensions : List.of());
        request.put("misalignmentCases", misalignmentCases != null ? misalignmentCases : List.of());
        request.put("optimizationGoals", optimizationGoals != null ? optimizationGoals : List.of());
        putIfHasText(request, "platformKey", platformKey);
        putIfHasText(request, "modelId", modelId);
        credentialResolver
                .flatMap(resolver -> resolver.resolve(platformKey))
                .ifPresent(credentials -> applyCredentials(request, credentials));
        return request;
    }

    private static void applyCredentials(Map<String, Object> request, LlmCredentials credentials) {
        request.put("llmBaseUrl", credentials.baseUrl());
        request.put("llmApiKey", credentials.apiKey());
    }

    private static void putIfHasText(Map<String, Object> target, String key, String value) {
        if (StringUtils.hasText(value)) {
            target.put(key, value.trim());
        }
    }

    private static void requireResolvedCredentials(Map<String, Object> request) {
        Object platformKey = request.get("platformKey");
        if (!(platformKey instanceof String key) || !StringUtils.hasText(key)) {
            return;
        }
        Object apiKey = request.get("llmApiKey");
        if (!(apiKey instanceof String resolved) || !StringUtils.hasText(resolved)) {
            throw new BusinessException(
                    ErrorCode.INVALID_OPERATION,
                    "DeepSeek API Key 未配置：请在后台 LLM Provider 为 provider="
                            + key.trim()
                            + " 配置密钥，并确认 LABELHUB_AES_KEY 可解密 llm_providers.api_key_ciphertext");
        }
        Object baseUrl = request.get("llmBaseUrl");
        if (!(baseUrl instanceof String resolvedBaseUrl) || !StringUtils.hasText(resolvedBaseUrl)) {
            throw new BusinessException(
                    ErrorCode.INVALID_OPERATION,
                    "LLM Base URL 未配置：请检查 provider=" + key.trim() + " 的 base_url 是否已填写");
        }
    }
}
