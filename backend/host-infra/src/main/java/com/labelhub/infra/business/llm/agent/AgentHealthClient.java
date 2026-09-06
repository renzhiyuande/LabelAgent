package com.labelhub.infra.business.llm.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AgentHealthClient {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String internalToken;
    private final String agentBaseUrl;

    public AgentHealthClient(
            @Value("${labelhub.agent.base-url:http://localhost:8000}") String agentBaseUrl,
            @Value("${labelhub.internal-token}") String internalToken,
            ObjectMapper objectMapper) {
        this.agentBaseUrl = agentBaseUrl == null ? "" : agentBaseUrl.trim();
        this.restClient = AgentRestClientSupport.create(this.agentBaseUrl);
        this.internalToken = internalToken;
        this.objectMapper = objectMapper;
    }

    public String agentBaseUrl() {
        return agentBaseUrl;
    }

    public AgentHealthProbeResult probe() {
        long started = System.nanoTime();
        try {
            String body = restClient.get()
                    .uri("/internal/health")
                    .header("X-Internal-Token", internalToken)
                    .retrieve()
                    .body(String.class);
            long latencyMs = Math.max(1L, (System.nanoTime() - started) / 1_000_000L);
            if (body == null || body.isBlank()) {
                return AgentHealthProbeResult.down(agentBaseUrl, latencyMs, "Agent returned empty health response");
            }
            JsonNode root = objectMapper.readTree(body);
            if (!"SUCCESS".equals(root.path("code").asText())) {
                return AgentHealthProbeResult.down(
                        agentBaseUrl,
                        latencyMs,
                        root.path("message").asText("Agent health check failed"));
            }
            JsonNode data = root.path("data");
            String status = data.path("status").asText("");
            String scope = data.path("scope").asText("");
            if (!"UP".equalsIgnoreCase(status)) {
                return AgentHealthProbeResult.down(agentBaseUrl, latencyMs, "Agent status=" + status);
            }
            String message = scope.isBlank() ? "Agent is UP" : "Agent is UP (" + scope + ")";
            return AgentHealthProbeResult.up(agentBaseUrl, latencyMs, message);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            long latencyMs = Math.max(1L, (System.nanoTime() - started) / 1_000_000L);
            return AgentHealthProbeResult.down(agentBaseUrl, latencyMs, ex.getMessage());
        }
    }

    public record AgentHealthProbeResult(
            boolean up,
            String agentBaseUrl,
            long latencyMs,
            String message) {
        public static AgentHealthProbeResult up(String agentBaseUrl, long latencyMs, String message) {
            return new AgentHealthProbeResult(true, agentBaseUrl, latencyMs, message);
        }

        public static AgentHealthProbeResult down(String agentBaseUrl, long latencyMs, String message) {
            return new AgentHealthProbeResult(false, agentBaseUrl, latencyMs, message);
        }
    }
}
