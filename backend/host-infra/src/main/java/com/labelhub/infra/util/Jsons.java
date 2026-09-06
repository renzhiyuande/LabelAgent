package com.labelhub.infra.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;

public final class Jsons {
    private static ObjectMapper objectMapper;

    private Jsons() {
    }

    public static void setObjectMapper(ObjectMapper mapper) {
        objectMapper = mapper;
    }

    public static String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to write json", ex);
        }
    }

    public static List<String> readStringList(String value) {
        try {
            return objectMapper.readValue(value, new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to read string list", ex);
        }
    }

    public static Map<String, Object> readMap(String value) {
        try {
            return objectMapper.readValue(value, new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to read map", ex);
        }
    }

    /**
     * 解析 JSON 字符串为 {@code Map<String, Object>}，失败时返回空 Map 而非抛异常。
     * 适用于可选/降级场景（如定时任务 payload 解析）。
     */
    public static Map<String, Object> readMapOrEmpty(String value) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }
}
