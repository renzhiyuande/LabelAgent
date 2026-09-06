package com.labelhub.infra.business.review.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.review.AiReviewContext;
import com.labelhub.core.review.AiReviewEngine;
import com.labelhub.core.review.AiReviewResult;
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
 * PyAgent AI 审核引擎：通过 REST 契约调用 Python Agent。
 */
@Component
@ConditionalOnProperty(name = "labelhub.review.ai-engine", havingValue = "pyagent")
public class PyAgentAiReviewEngine implements AiReviewEngine {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String internalToken;
    private final Optional<AgentLlmCredentialResolver> credentialResolver;

    public PyAgentAiReviewEngine(
            @Value("${labelhub.agent.base-url:http://localhost:8000}") String agentBaseUrl,
            @Value("${labelhub.internal-token}") String internalToken,
            ObjectMapper objectMapper,
            @Autowired(required = false) AgentLlmCredentialResolver credentialResolver) {
        this.restClient = AgentRestClientSupport.create(agentBaseUrl);
        this.internalToken = internalToken;
        this.objectMapper = objectMapper;
        this.credentialResolver = Optional.ofNullable(credentialResolver);
    }

    @Override
    public AiReviewResult review(AiReviewContext context) {
        try {
            Map<String, Object> request = buildRequest(context);
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/v1/ai-review")
                    .header("X-Internal-Token", internalToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(AgentRestClientSupport.toJsonBody(objectMapper, request))
                    .retrieve()
                    .body(Map.class);
            if (response == null) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "PyAgent returned empty response");
            }
            return objectMapper.convertValue(response, AiReviewResult.class);
        } catch (BusinessException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            throw new BusinessException(
                    ErrorCode.SYSTEM_ERROR,
                    "PyAgent AI review failed: HTTP " + ex.getStatusCode().value() + " " + ex.getResponseBodyAsString());
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                    "PyAgent AI review failed: " + ex.getMessage());
        }
    }

    Map<String, Object> buildRequest(AiReviewContext context) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("submissionId", context.submissionId());
        request.put("submissionVersionId", context.submissionVersionId());
        request.put("taskId", context.taskId());
        putIfHasText(request, "platformKey", context.platformKey());
        putIfHasText(request, "modelId", context.modelId());
        putIfHasText(request, "promptTemplate", context.promptTemplate());
        putIfHasText(request, "outputSchemaJson", context.outputSchemaJson());
        request.put("submitData", context.submitData() != null ? context.submitData() : Map.of());
        request.put("itemPayload", context.itemPayload() != null ? context.itemPayload() : Map.of());
        request.put("dimensions", context.dimensions() != null ? context.dimensions() : List.of());
        request.put("memoryContext", context.memoryContext() != null ? context.memoryContext() : List.of());
        credentialResolver
                .flatMap(resolver -> resolver.resolve(context.platformKey()))
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
}
