package com.labelhub.infra.business.display;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;

/** 题目 payload 列表预览（与 DbTaskService 规则一致，取前 4 个键）。 */
public final class TaskPayloadPreviewSupport {
    private TaskPayloadPreviewSupport() {
    }

    public static Map<String, Object> toPayloadMap(ObjectMapper objectMapper, String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return Map.of();
        }
        return parsePayloadMap(objectMapper, rawJson);
    }

    public static Map<String, Object> toPayloadPreview(ObjectMapper objectMapper, String rawJson) {
        Map<String, Object> payload = toPayloadMap(objectMapper, rawJson);
        if (payload.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> preview = new LinkedHashMap<>();
        int count = 0;
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            if (count >= 4) {
                break;
            }
            preview.put(entry.getKey(), entry.getValue());
            count++;
        }
        return preview;
    }

    private static Map<String, Object> parsePayloadMap(ObjectMapper objectMapper, String rawJson) {
        try {
            Map<String, Object> parsed = objectMapper.readValue(rawJson, new TypeReference<>() {
            });
            return parsed == null ? Map.of() : parsed;
        } catch (Exception ex) {
            return Map.of();
        }
    }
}
