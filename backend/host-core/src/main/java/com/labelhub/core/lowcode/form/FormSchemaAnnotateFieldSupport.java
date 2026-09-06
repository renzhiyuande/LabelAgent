package com.labelhub.core.lowcode.form;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 标注提交校验范围：与前端 {@code splitLabelerFormSchema} / {@code resolveImportRole} 对齐，
 * 仅校验 {@code importRole=input} 且可编辑的作答字段。
 */
final class FormSchemaAnnotateFieldSupport {

    private static final List<String> SKIP_COMPONENTS = List.of(
            "showitem",
            "showimage",
            "showfile",
            "llmsuggest",
            "dicttagpreview",
            "dynamictable",
            "remoteschema",
            "divider");

    private FormSchemaAnnotateFieldSupport() {
    }

    static List<Map<String, Object>> collectAnnotateFields(Map<String, Object> schemaRoot) {
        if (schemaRoot == null || schemaRoot.isEmpty()) {
            return List.of();
        }
        Object sectionsObj = schemaRoot.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return List.of();
        }
        List<Map<String, Object>> output = new ArrayList<>();
        for (Object sectionObj : sections) {
            if (!(sectionObj instanceof Map<?, ?> section)) {
                continue;
            }
            if (!isSectionVisible(section, FormSchemaValidationOptions.forAssignment())) {
                continue;
            }
            Object fieldsObj = section.get("fields");
            if (fieldsObj instanceof List<?> fields) {
                collectFields(fields, output, FormSchemaValidationOptions.forAssignment());
            }
        }
        collectRuntimeAssistFields(schemaRoot, output);
        return output;
    }

    @SuppressWarnings("unchecked")
    private static void collectRuntimeAssistFields(Map<String, Object> schemaRoot, List<Map<String, Object>> output) {
        for (Map<String, Object> field : collectRuntimeFields(schemaRoot)) {
            if (shouldValidateField(field, FormSchemaValidationOptions.forAssignment(), Map.of())) {
                output.add(field);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> collectRuntimeFields(Map<String, Object> schemaRoot) {
        List<Map<String, Object>> runtime = new ArrayList<>();
        Object sectionsObj = schemaRoot.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return runtime;
        }
        for (Object sectionObj : sections) {
            if (!(sectionObj instanceof Map<?, ?> section)) {
                continue;
            }
            Object fieldsObj = section.get("fields");
            if (fieldsObj instanceof List<?> fields) {
                visitRuntimeFields(fields, runtime);
            }
        }
        return runtime;
    }

    @SuppressWarnings("unchecked")
    private static void visitRuntimeFields(List<?> fields, List<Map<String, Object>> runtime) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> rawField)) {
                continue;
            }
            Map<String, Object> field = (Map<String, Object>) rawField;
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                visitRuntimeFields(nestedFields, runtime);
            }
            if ("runtime".equals(resolveImportRole(field)) && !isNonPayloadShowField(field)) {
                runtime.add(field);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static void collectFields(
            List<?> fields,
            List<Map<String, Object>> output,
            FormSchemaValidationOptions options) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> rawField)) {
                continue;
            }
            Map<String, Object> field = (Map<String, Object>) rawField;
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                collectFields(nestedFields, output, options);
            }
            if (!"input".equals(resolveImportRole(field))) {
                continue;
            }
            output.add(field);
        }
    }

    static boolean shouldValidateField(
            Map<String, Object> field,
            FormSchemaValidationOptions options,
            Map<String, Object> values) {
        if (field == null || field.isEmpty()) {
            return false;
        }
        if (Boolean.TRUE.equals(field.get("hidden"))) {
            return false;
        }
        if (!isVisibleInMode(field.get("visibleIn"), options.modeOrDefault())) {
            return false;
        }
        if (!FormSchemaConditionEvaluator.evaluateAll(values, field.get("visibleWhen"))) {
            return false;
        }
        if (isDisabled(field, options, values)) {
            return false;
        }
        String component = componentName(field);
        if (component != null && SKIP_COMPONENTS.contains(component)) {
            return false;
        }
        return resolveBinding(field) != null;
    }

    static boolean isSectionVisible(Map<?, ?> section, FormSchemaValidationOptions options) {
        return isVisibleInMode(section.get("visibleIn"), options.modeOrDefault());
    }

    private static boolean isDisabled(
            Map<String, Object> field,
            FormSchemaValidationOptions options,
            Map<String, Object> values) {
        String component = componentName(field);
        if ("llmsuggest".equals(component)) {
            return field.get("disabledWhen") != null
                    && FormSchemaConditionEvaluator.evaluateAll(values, field.get("disabledWhen"));
        }
        if (isDisabledInMode(field.get("disabledIn"), options.modeOrDefault())) {
            return true;
        }
        if (Boolean.TRUE.equals(field.get("readonly")) || Boolean.TRUE.equals(field.get("readOnly"))) {
            return true;
        }
        return field.get("disabledWhen") != null
                && FormSchemaConditionEvaluator.evaluateAll(values, field.get("disabledWhen"));
    }

    static String resolveBinding(Map<String, Object> field) {
        Object path = field.get("path");
        if (path != null && !path.toString().isBlank()) {
            return path.toString().trim();
        }
        Object key = field.get("key");
        if (key != null && !key.toString().isBlank()) {
            return key.toString().trim();
        }
        return null;
    }

    static String resolveLabel(Map<String, Object> field, String fallback) {
        Object label = field.get("label");
        if (label != null && !label.toString().isBlank()) {
            return label.toString().trim();
        }
        return fallback;
    }

    @SuppressWarnings("unchecked")
    static String resolveImportRole(Map<String, Object> field) {
        Object component = field.get("component");
        if (component != null) {
            String name = component.toString();
            if ("showItem".equals(name)) {
                return showItemContentSource(field) == null || "payload".equals(showItemContentSource(field))
                        ? "display"
                        : "runtime";
            }
            if ("showImage".equals(name) || "showFile".equals(name) || "showVideo".equals(name)) {
                String source = showAssetContentSource(field, name);
                return "payload".equals(source) ? "display" : "runtime";
            }
            if ("dictTagPreview".equals(name)) {
                return "runtime";
            }
        }
        Object meta = field.get("meta");
        if (meta instanceof Map<?, ?> metaMap) {
            Object role = metaMap.get("importRole");
            if (role != null && !role.toString().isBlank()) {
                return role.toString().trim().toLowerCase();
            }
        }
        if (isRuntimeComponent(field)) {
            return "runtime";
        }
        if (Boolean.TRUE.equals(field.get("readonly")) || Boolean.TRUE.equals(field.get("readOnly"))) {
            return "display";
        }
        return resolveBinding(field) == null ? "" : "input";
    }

    private static boolean isNonPayloadShowField(Map<String, Object> field) {
        Object component = field.get("component");
        if (component == null) {
            return false;
        }
        String name = component.toString();
        if ("showItem".equals(name)) {
            String source = showItemContentSource(field);
            return source != null && !"payload".equals(source);
        }
        if ("showImage".equals(name) || "showFile".equals(name) || "showVideo".equals(name)) {
            String source = showAssetContentSource(field, name);
            return source != null && !"payload".equals(source);
        }
        return false;
    }

    private static String showItemContentSource(Map<String, Object> field) {
        Object showItem = field.get("showItem");
        if (showItem instanceof Map<?, ?> map) {
            Object source = map.get("contentSource");
            return source == null ? "payload" : source.toString();
        }
        return "payload";
    }

    private static String showAssetContentSource(Map<String, Object> field, String component) {
        Object config = switch (component) {
            case "showImage" -> field.get("showImage");
            case "showVideo" -> field.get("showVideo");
            default -> field.get("showFile");
        };
        if (config instanceof Map<?, ?> map) {
            Object source = map.get("contentSource");
            return source == null ? "payload" : source.toString();
        }
        return "payload";
    }

    private static boolean isRuntimeComponent(Map<String, Object> field) {
        Object component = field.get("component");
        if (component != null && component.toString().toLowerCase().startsWith("llm")) {
            return true;
        }
        Object meta = field.get("meta");
        if (meta instanceof Map<?, ?> metaMap) {
            Object source = metaMap.get("payloadSource");
            if (source != null && "runtime".equalsIgnoreCase(source.toString())) {
                return true;
            }
            if (Boolean.TRUE.equals(metaMap.get("allowImport"))) {
                return false;
            }
        }
        return false;
    }

    private static String componentName(Map<String, Object> field) {
        Object component = field.get("component");
        return component == null ? null : component.toString().trim().toLowerCase();
    }

    private static boolean isVisibleInMode(Object visibleInObj, String mode) {
        if (!(visibleInObj instanceof List<?> visibleIn) || visibleIn.isEmpty()) {
            return true;
        }
        for (Object item : visibleIn) {
            if (item != null && mode.equals(item.toString())) {
                return true;
            }
        }
        return false;
    }

    private static boolean isDisabledInMode(Object disabledInObj, String mode) {
        if (!(disabledInObj instanceof List<?> disabledIn) || disabledIn.isEmpty()) {
            return false;
        }
        for (Object item : disabledIn) {
            if (item != null && mode.equals(item.toString())) {
                return true;
            }
        }
        return false;
    }
}
