package com.labelhub.core.business.settings;

import java.util.List;
import java.util.Map;
import java.util.Set;

final class SettingsJsonSupport {

    private SettingsJsonSupport() {
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> childMap(Map<String, Object> root, String key) {
        if (root == null) {
            return Map.of();
        }
        Object value = root.get(key);
        return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    }

    static boolean readBoolean(Object value, boolean fallback) {
        if (value instanceof Boolean boolValue) {
            return boolValue;
        }
        if (value instanceof String text) {
            return Boolean.parseBoolean(text);
        }
        return fallback;
    }

    static Integer readInteger(Object value, Integer fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text) {
            try {
                return Integer.parseInt(text);
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    static Set<String> readStatusSet(Object value, Set<String> fallback) {
        if (value instanceof List<?> list) {
            return list.stream().filter(String.class::isInstance).map(String.class::cast).collect(java.util.stream.Collectors.toSet());
        }
        return fallback;
    }
}
