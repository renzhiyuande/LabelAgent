package com.labelhub.core.lowcode.form;

import java.util.List;
import java.util.Map;

/** 与前端 {@code getValueAtPath} 一致的点分路径读取。 */
public final class FormSchemaJsonPaths {

    private FormSchemaJsonPaths() {
    }

    @SuppressWarnings("unchecked")
    public static Object readValue(Map<String, Object> data, String path) {
        if (data == null || path == null || path.isBlank()) {
            return null;
        }
        Object current = data;
        for (String segment : path.split("\\.")) {
            current = step(current, segment);
            if (current == null) {
                return null;
            }
        }
        return current;
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> objectAtPath(Map<String, Object> data, String path) {
        Object value = readValue(data, path);
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    public static void writeValue(Map<String, Object> data, String path, Object value) {
        if (data == null || path == null || path.isBlank()) {
            return;
        }
        String[] segments = path.split("\\.");
        Object current = data;
        for (int i = 0; i < segments.length - 1; i++) {
            current = step(current, segments[i]);
            if (current == null) {
                return;
            }
        }
        assign(current, segments[segments.length - 1], value);
    }

    @SuppressWarnings("unchecked")
    private static Object step(Object current, String segment) {
        if (current instanceof Map<?, ?> map) {
            return map.get(segment);
        }
        if (current instanceof List<?> list) {
            int index = parseIndex(segment);
            if (index < 0 || index >= list.size()) {
                return null;
            }
            return list.get(index);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static void assign(Object parent, String segment, Object value) {
        if (parent instanceof Map<?, ?> map) {
            ((Map<String, Object>) map).put(segment, value);
            return;
        }
        if (parent instanceof List<?> list) {
            int index = parseIndex(segment);
            if (index < 0 || index >= list.size()) {
                return;
            }
            ((List<Object>) list).set(index, value);
        }
    }

    private static int parseIndex(String segment) {
        try {
            return Integer.parseInt(segment);
        } catch (NumberFormatException ex) {
            return -1;
        }
    }
}
