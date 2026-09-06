package com.labelhub.infra.business.llm.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class AgentLlmChatClient {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String internalToken;
    private final double temperature;

    public AgentLlmChatClient(
            @Value("${labelhub.agent.base-url:http://localhost:8000}") String agentBaseUrl,
            @Value("${labelhub.internal-token}") String internalToken,
            @Value("${labelhub.llm.temperature:0.3}") double temperature,
            ObjectMapper objectMapper) {
        this.restClient = AgentRestClientSupport.create(agentBaseUrl);
        this.internalToken = internalToken;
        this.temperature = temperature;
        this.objectMapper = objectMapper;
    }

    public String chat(String baseUrl, String apiKey, String model, String systemPrompt, String userPrompt) {
        return chat(baseUrl, apiKey, model, systemPrompt, userPrompt, null);
    }

    public String chat(
            String baseUrl,
            String apiKey,
            String model,
            String systemPrompt,
            String userPrompt,
            Map<String, Object> outputJsonSchema) {
        if (!StringUtils.hasText(baseUrl)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "LLM baseUrl 未配置");
        }
        if (!StringUtils.hasText(apiKey)) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "LLM API Key 未配置，请在「系统管理 → LLM 提供商」中为对应平台填写 API Key");
        }
        if (!StringUtils.hasText(model)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "LLM model 未配置");
        }
        try {
            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system", "content", systemPrompt == null ? "" : systemPrompt),
                    Map.of("role", "user", "content", userPrompt == null ? "" : userPrompt));
            Map<String, Object> request = new LinkedHashMap<>();
            request.put("baseUrl", baseUrl);
            request.put("apiKey", apiKey);
            request.put("model", model);
            request.put("messages", messages);
            request.put("temperature", temperature);
            if (outputJsonSchema != null && !outputJsonSchema.isEmpty()) {
                request.put("outputJsonSchema", outputJsonSchema);
            }

            String body = restClient.post()
                    .uri("/internal/llm/chat")
                    .header("X-Internal-Token", internalToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(AgentRestClientSupport.toJsonBody(objectMapper, request))
                    .retrieve()
                    .body(String.class);
            if (body == null || body.isBlank()) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Agent returned empty response");
            }
            JsonNode root = objectMapper.readTree(body);
            if (!"SUCCESS".equals(root.path("code").asText())) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                        root.path("message").asText("LLM chat failed"));
            }
            String text = root.path("data").path("text").asText("");
            return text == null ? "" : text.trim();
        } catch (BusinessException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                    "LLM chat failed: HTTP " + ex.getStatusCode().value() + " "
                            + AgentRestClientSupport.truncate(ex.getResponseBodyAsString(), 300));
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "LLM chat failed: " + ex.getMessage());
        }
    }


}
