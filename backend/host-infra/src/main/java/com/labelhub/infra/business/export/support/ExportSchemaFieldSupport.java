package com.labelhub.infra.business.export.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 从模板 form schema 解析导出字段绑定、展示名与选项映射。 */
public final class ExportSchemaFieldSupport {

    private ExportSchemaFieldSupport() {
    }

    public record TemplateExportField(
            String binding,
            ExportFieldCatalogSupport.TemplateFieldRole role,
            String label,
            String dictCode,
            Map<String, String> staticOptionLabels) {
    }

    public static Map<String, TemplateExportField> loadTemplateFields(String schemaJson, ObjectMapper objectMapper) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return Map.of();
        }
        try {
            Map<String, Object> schema = objectMapper.readValue(schemaJson, new TypeReference<>() {
            });
            Map<String, TemplateExportField> result = new LinkedHashMap<>();
            walkSchemaFields(schema, result);
            return result;
        } catch (Exception ex) {
            return Map.of();
        }
    }

    @SuppressWarnings("unchecked")
    private static void walkSchemaFields(Map<String, Object> schema, Map<String, TemplateExportField> out) {
        Object sectionsObj = schema.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return;
        }
        for (Object sectionObj : sections) {
            if (!(sectionObj instanceof Map<?, ?> section)) {
                continue;
            }
            Object fieldsObj = section.get("fields");
            if (!(fieldsObj instanceof List<?> fields)) {
                continue;
            }
            for (Object fieldObj : fields) {
                if (fieldObj instanceof Map<?, ?> rawField) {
                    collectField((Map<String, Object>) rawField, out);
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static void collectField(Map<String, Object> field, Map<String, TemplateExportField> out) {
        String component = stringVal(field.get("component"));
        if ("group".equalsIgnoreCase(component) || "section".equalsIgnoreCase(component)) {
            Object children = field.get("fields");
            if (children instanceof List<?> list) {
                for (Object child : list) {
                    if (child instanceof Map<?, ?> rawChild) {
                        collectField((Map<String, Object>) rawChild, out);
                    }
                }
            }
            return;
        }
        String binding = resolveBinding(field);
        if (binding == null) {
            return;
        }
        ExportFieldCatalogSupport.TemplateFieldRole role = classifyField(field, component);
        if (role == null) {
            return;
        }
        out.putIfAbsent(binding, new TemplateExportField(
                binding,
                role,
                resolveLabel(field, binding),
                resolveDictCode(field),
                parseStaticOptionLabels(field.get("options"))));
    }

    static ExportFieldCatalogSupport.TemplateFieldRole classifyField(Map<String, Object> field, String component) {
        if (component == null) {
            component = "";
        }
        if ("dictTagPreview".equals(component) || component.toLowerCase().startsWith("llm")) {
            return ExportFieldCatalogSupport.TemplateFieldRole.RUNTIME;
        }
        Map<String, Object> meta = metaMap(field.get("meta"));
        String importRole = stringVal(meta.get("importRole"));
        if ("runtime".equalsIgnoreCase(importRole)) {
            return ExportFieldCatalogSupport.TemplateFieldRole.RUNTIME;
        }
        if ("display".equalsIgnoreCase(importRole)) {
            return ExportFieldCatalogSupport.TemplateFieldRole.PAYLOAD;
        }
        if ("input".equalsIgnoreCase(importRole)) {
            return ExportFieldCatalogSupport.TemplateFieldRole.ANNOTATE;
        }
        if ("showItem".equals(component)) {
            String contentSource = showItemContentSource(field);
            return "payload".equals(contentSource)
                    ? ExportFieldCatalogSupport.TemplateFieldRole.PAYLOAD
                    : ExportFieldCatalogSupport.TemplateFieldRole.RUNTIME;
        }
        if ("showImage".equals(component) || "showFile".equals(component) || "showVideo".equals(component)) {
            String contentSource = showAssetContentSource(field, component);
            return "payload".equals(contentSource)
                    ? ExportFieldCatalogSupport.TemplateFieldRole.PAYLOAD
                    : ExportFieldCatalogSupport.TemplateFieldRole.RUNTIME;
        }
        if (Boolean.TRUE.equals(field.get("readonly"))) {
            return ExportFieldCatalogSupport.TemplateFieldRole.PAYLOAD;
        }
        return ExportFieldCatalogSupport.TemplateFieldRole.ANNOTATE;
    }

    private static String resolveLabel(Map<String, Object> field, String binding) {
        String label = stringVal(field.get("label"));
        if (label != null && !label.isBlank()) {
            return label.trim();
        }
        return binding;
    }

  private static String resolveDictCode(Map<String, Object> field) {
        String dict = stringVal(field.get("dict"));
        if (dict != null && !dict.isBlank()) {
            return dict.trim();
        }
        Object remote = field.get("remote");
        if (remote instanceof Map<?, ?> remoteMap) {
            String source = stringVal(remoteMap.get("source"));
            if (source != null && source.startsWith("dict:")) {
                return source.substring("dict:".length()).trim();
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> parseStaticOptionLabels(Object raw) {
        if (!(raw instanceof List<?> list) || list.isEmpty()) {
            return Map.of();
        }
        Map<String, String> labels = new LinkedHashMap<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> option)) {
                continue;
            }
            Object value = option.get("value");
            if (value == null) {
                continue;
            }
            String valueKey = String.valueOf(value);
            Object label = option.get("label");
            labels.put(valueKey, label == null || String.valueOf(label).isBlank() ? valueKey : String.valueOf(label).trim());
        }
        return Map.copyOf(labels);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> metaMap(Object raw) {
        if (raw instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    @SuppressWarnings("unchecked")
    private static String showItemContentSource(Map<String, Object> field) {
        Object showItem = field.get("showItem");
        if (showItem instanceof Map<?, ?> map) {
            Object source = map.get("contentSource");
            if (source != null) {
                return String.valueOf(source);
            }
        }
        return "payload";
    }

    @SuppressWarnings("unchecked")
    private static String showAssetContentSource(Map<String, Object> field, String component) {
        Object meta = field.get(component);
        if (meta instanceof Map<?, ?> map) {
            Object source = map.get("contentSource");
            if (source != null) {
                return String.valueOf(source);
            }
        }
        return "payload";
    }

    private static String resolveBinding(Map<String, Object> field) {
        String path = stringVal(field.get("path"));
        if (path != null && !path.isBlank()) {
            return path.trim();
        }
        String key = stringVal(field.get("key"));
        return key == null || key.isBlank() ? null : key.trim();
    }

    private static String stringVal(Object raw) {
        return raw == null ? null : String.valueOf(raw);
    }
}
