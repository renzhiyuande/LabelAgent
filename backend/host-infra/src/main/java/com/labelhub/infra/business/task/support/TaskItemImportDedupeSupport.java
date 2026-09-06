package com.labelhub.infra.business.task.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * 导入去重：业务 ID 列 或 稳定序列化 payload 的 SHA256。
 */
public final class TaskItemImportDedupeSupport {
    public static final String CONTENT_HASH_SOURCE_KEY = "__content_hash__";

    private static final List<String> DEFAULT_SOURCE_KEY_CANDIDATES = List.of(
            "id", "Id", "ID",
            "sourceItemKey", "source_item_key",
            "sample_id", "sampleId", "sample_ID",
            "doc_id", "docId",
            "item_id", "itemId",
            "uuid", "UUID");

    private TaskItemImportDedupeSupport() {
    }

    public static String detectDefaultSourceKeyField(List<Map<String, Object>> items) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        for (String candidate : DEFAULT_SOURCE_KEY_CANDIDATES) {
            if (!hasColumn(items, candidate)) {
                continue;
            }
            if (hasNonEmptyValue(items, candidate)) {
                return candidate;
            }
        }
        return null;
    }

    public static boolean requiresExplicitSourceKeyField(List<Map<String, Object>> items) {
        return detectDefaultSourceKeyField(items) == null;
    }

    public static String resolveSourceItemKey(
            Map<String, Object> item,
            String sourceKeyField,
            String payloadHash) {
        if (CONTENT_HASH_SOURCE_KEY.equals(sourceKeyField)) {
            return hashSourceKey(payloadHash);
        }
        Object raw = item.get(sourceKeyField);
        String businessKey = stringifyKeyValue(raw);
        if (!businessKey.isBlank()) {
            return truncate("biz:" + businessKey, 120);
        }
        return hashSourceKey(payloadHash);
    }

    public static String canonicalPayloadJson(ObjectMapper objectMapper, Map<String, Object> item) throws Exception {
        Object canonical = canonicalizeValue(item);
        return objectMapper.writeValueAsString(canonical);
    }

    private static String hashSourceKey(String payloadHash) {
        return "hash:" + payloadHash;
    }

    private static boolean hasColumn(List<Map<String, Object>> items, String key) {
        for (Map<String, Object> item : items) {
            if (item.containsKey(key)) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasNonEmptyValue(List<Map<String, Object>> items, String key) {
        for (Map<String, Object> item : items) {
            if (!stringifyKeyValue(item.get(key)).isBlank()) {
                return true;
            }
        }
        return false;
    }

    private static String stringifyKeyValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof String text) {
            return text.trim();
        }
        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }
        return value.toString().trim();
    }

    private static String truncate(String value, int maxLen) {
        if (value.length() <= maxLen) {
            return value;
        }
        return value.substring(0, maxLen);
    }

    @SuppressWarnings("unchecked")
    private static Object canonicalizeValue(Object value) {
        if (value instanceof Map<?, ?> map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                sorted.put(String.valueOf(entry.getKey()), canonicalizeValue(entry.getValue()));
            }
            return sorted;
        }
        if (value instanceof List<?> list) {
            List<Object> normalized = new ArrayList<>(list.size());
            for (Object element : list) {
                normalized.add(canonicalizeValue(element));
            }
            return normalized;
        }
        return value;
    }
}
