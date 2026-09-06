package com.labelhub.infra.business.display;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** 按模板 schema 将草稿 JSON 映射为列表/详情可直接展示的纯文本摘要。 */
public final class FormSchemaDraftPreviewSupport {
    private static final int MAX_FIELDS = 8;
    private static final String SEPARATOR = " · ";

    private FormSchemaDraftPreviewSupport() {
    }

    public static String toPreviewText(ObjectMapper objectMapper, String schemaJson, String draftDataJson) {
        Map<String, Object> draftData = parseMap(objectMapper, draftDataJson);
        if (draftData.isEmpty()) {
            return null;
        }
        List<FieldDescriptor> schemaFields = collectInputFieldDescriptors(objectMapper, schemaJson);
        if (schemaFields.isEmpty()) {
            return fallbackPreview(draftData);
        }
        List<String> parts = new ArrayList<>();
        for (FieldDescriptor field : schemaFields) {
            if (parts.size() >= MAX_FIELDS) {
                break;
            }
            Object raw = readValue(draftData, field.binding());
            String text = formatValue(raw);
            if (text == null || text.isBlank()) {
                continue;
            }
            parts.add(field.label() + ": " + text);
        }
        return parts.isEmpty() ? null : String.join(SEPARATOR, parts);
    }

    private static String fallbackPreview(Map<String, Object> draftData) {
        List<String> parts = new ArrayList<>();
        for (Map.Entry<String, Object> entry : draftData.entrySet()) {
            if (parts.size() >= MAX_FIELDS) {
                break;
            }
            String text = formatValue(entry.getValue());
            if (text == null || text.isBlank()) {
                continue;
            }
            parts.add(entry.getKey() + ": " + text);
        }
        return parts.isEmpty() ? null : String.join(SEPARATOR, parts);
    }

    private static List<FieldDescriptor> collectInputFieldDescriptors(ObjectMapper objectMapper, String schemaJson) {
        Map<String, Object> root = parseMap(objectMapper, schemaJson);
        if (root.isEmpty()) {
            return List.of();
        }
        Object sectionsObj = root.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return List.of();
        }
        List<FieldDescriptor> fields = new ArrayList<>();
        for (Object sectionObj : sections) {
            if (sectionObj instanceof Map<?, ?> section) {
                Object fieldsObj = section.get("fields");
                if (fieldsObj instanceof List<?> sectionFields) {
                    collectInputFields(sectionFields, fields);
                }
            }
        }
        return fields;
    }

    private static void collectInputFields(List<?> fields, List<FieldDescriptor> output) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                collectInputFields(nestedFields, output);
            }
            if (!isInputField(field)) {
                continue;
            }
            String binding = resolveBinding(field);
            if (binding == null) {
                continue;
            }
            String label = resolveLabel(field, binding);
            output.add(new FieldDescriptor(binding, label));
        }
    }

    private static boolean isInputField(Map<?, ?> field) {
        if (isRuntimeField(field)) {
            return false;
        }
        String role = resolveImportRole(field);
        if ("input".equals(role)) {
            return true;
        }
        if ("display".equals(role) || "runtime".equals(role)) {
            return false;
        }
        if (Boolean.TRUE.equals(field.get("readonly")) || Boolean.TRUE.equals(field.get("readOnly"))) {
            return false;
        }
        Object component = field.get("component");
        if (component != null) {
            String name = component.toString().toLowerCase();
            if (name.startsWith("show") || "divider".equals(name)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isRuntimeField(Map<?, ?> field) {
        Object component = field.get("component");
        if (component != null && component.toString().toLowerCase().startsWith("llm")) {
            return true;
        }
        Object meta = field.get("meta");
        if (meta instanceof Map<?, ?> metaMap) {
            Object role = metaMap.get("importRole");
            if (role != null && "runtime".equalsIgnoreCase(role.toString())) {
                return true;
            }
            Object source = metaMap.get("payloadSource");
            if (source != null && "runtime".equalsIgnoreCase(source.toString())) {
                return true;
            }
        }
        return false;
    }

    private static String resolveImportRole(Map<?, ?> field) {
        Object meta = field.get("meta");
        if (meta instanceof Map<?, ?> metaMap) {
            Object role = metaMap.get("importRole");
            if (role != null) {
                return role.toString().trim().toLowerCase();
            }
        }
        return "";
    }

    private static String resolveBinding(Map<?, ?> field) {
        Object path = field.get("path");
        if (path != null && !path.toString().isBlank()) {
            return path.toString();
        }
        Object key = field.get("key");
        if (key != null && !key.toString().isBlank()) {
            return key.toString();
        }
        return null;
    }

    private static String resolveLabel(Map<?, ?> field, String fallback) {
        Object label = field.get("label");
        if (label != null && !label.toString().isBlank()) {
            return label.toString().trim();
        }
        return fallback;
    }

    private static Object readValue(Map<String, Object> data, String binding) {
        if (!binding.contains(".")) {
            return data.get(binding);
        }
        Object current = data;
        for (String segment : binding.split("\\.")) {
            if (!(current instanceof Map<?, ?> map)) {
                return null;
            }
            current = map.get(segment);
        }
        return current;
    }

    private static String formatValue(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof String text) {
            String trimmed = text.trim();
            return trimmed.isEmpty() ? null : trimmed;
        }
        if (raw instanceof Number || raw instanceof Boolean) {
            return raw.toString();
        }
        if (raw instanceof List<?> list) {
            List<String> parts = new ArrayList<>();
            for (Object item : list) {
                String text = formatValue(item);
                if (text != null && !text.isBlank()) {
                    parts.add(text);
                }
            }
            return parts.isEmpty() ? null : String.join(", ", parts);
        }
        if (raw instanceof Map<?, ?> map) {
            if (map.isEmpty()) {
                return null;
            }
            String fileLabel = formatFileRef(map);
            if (fileLabel != null) {
                return fileLabel;
            }
            return map.toString();
        }
        return raw.toString();
    }

    private static String formatFileRef(Map<?, ?> map) {
        Object id = map.get("fileId");
        if (id == null) {
            id = map.get("id");
        }
        if (id == null) {
            return null;
        }
        Object name = map.get("name");
        if (name == null) {
            name = map.get("originalName");
        }
        if (name != null && !name.toString().isBlank()) {
            return name.toString().trim();
        }
        return "文件#" + id;
    }

    private static Map<String, Object> parseMap(ObjectMapper objectMapper, String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {
            });
            return parsed == null ? Map.of() : parsed;
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private record FieldDescriptor(String binding, String label) {
    }
}
