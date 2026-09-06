package com.labelhub.infra.business.llm.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

public final class LlmStructuredResponseParser {
    private static final Pattern JSON_FENCE =
            Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```", Pattern.CASE_INSENSITIVE);

    private LlmStructuredResponseParser() {
    }

    public static Map<String, Object> tryParseJsonObject(String raw, ObjectMapper objectMapper) {
        if (!StringUtils.hasText(raw)) {
            return Map.of();
        }
        String trimmed = raw.trim();
        for (String candidate : List.of(trimmed, extractJsonFence(trimmed), extractObject(trimmed))) {
            if (!StringUtils.hasText(candidate)) {
                continue;
            }
            Map<String, Object> parsed = parseCandidate(candidate, objectMapper);
            if (!parsed.isEmpty()) {
                return parsed;
            }
        }
        return Map.of();
    }

    private static String extractJsonFence(String text) {
        Matcher matcher = JSON_FENCE.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "";
    }

    private static String extractObject(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return "";
        }
        return text.substring(start, end + 1).trim();
    }

    private static Map<String, Object> parseCandidate(String candidate, ObjectMapper objectMapper) {
        try {
            Map<String, Object> map = objectMapper.readValue(candidate, new TypeReference<>() {
            });
            if (map == null || map.isEmpty()) {
                return Map.of();
            }
            return new LinkedHashMap<>(map);
        } catch (Exception ignored) {
            return Map.of();
        }
    }
}
