package com.labelhub.infra.business.llm.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.RemoteLlmModelOption;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AgentLlmModelDiscoveryClient {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String internalToken;

    public AgentLlmModelDiscoveryClient(
            @Value("${labelhub.agent.base-url:http://localhost:8000}") String agentBaseUrl,
            @Value("${labelhub.internal-token}") String internalToken,
            ObjectMapper objectMapper) {
        this.restClient = AgentRestClientSupport.create(agentBaseUrl);
        this.internalToken = internalToken;
        this.objectMapper = objectMapper;
    }

    public List<RemoteLlmModelOption> listRemoteModels(String baseUrl, String apiKey, String providerCode) {
        try {
            Map<String, Object> request = Map.of(
                    "baseUrl", baseUrl,
                    "apiKey", apiKey,
                    "providerCode", providerCode == null ? "" : providerCode);
            String body = restClient.post()
                    .uri("/internal/llm/list-models")
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
                        root.path("message").asText("Remote model discovery failed"));
            }
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                return List.of();
            }
            List<RemoteLlmModelOption> options = new ArrayList<>();
            for (JsonNode item : data) {
                String modelCode = item.path("modelCode").asText("");
                if (modelCode.isBlank()) {
                    continue;
                }
                String modelName = item.path("modelName").asText(modelCode);
                String modelType = item.path("modelType").asText("CHAT");
                options.add(new RemoteLlmModelOption(modelCode, modelName, modelType));
            }
            return options;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                    "Remote model discovery failed: " + ex.getMessage());
        }
    }
}
