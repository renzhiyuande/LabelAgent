package com.labelhub.infra.business.llm.agent;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * 构建与 Python Agent（uvicorn）兼容的 RestClient。
 * 强制 HTTP/1.1，避免 JDK HttpClient 发送 h2c 升级导致 "Invalid HTTP request received"。
 */
public final class AgentRestClientSupport {
    private AgentRestClientSupport() {
    }

    public static RestClient create(String baseUrl) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(120));
        return RestClient.builder()
                .baseUrl(normalizeBaseUrl(baseUrl))
                .requestFactory(requestFactory)
                .build();
    }

    public static String normalizeBaseUrl(String baseUrl) {
        if (baseUrl == null) {
            return "";
        }
        return baseUrl.trim().replaceAll("/+$", "");
    }

    public static String toJsonBody(ObjectMapper objectMapper, Object body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Failed to serialize agent request body", ex);
        }
    }

    /**
     * 截断字符串，过长时截断并追加 "..."。
     * 提取自 {@code AgentLlmChatClient.truncate} 的私有实现。
     */
    public static String truncate(String value, int maxLen) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() <= maxLen ? trimmed : trimmed.substring(0, maxLen) + "...";
    }
}
