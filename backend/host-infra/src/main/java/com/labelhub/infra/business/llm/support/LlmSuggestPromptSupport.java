package com.labelhub.infra.business.llm.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.LlmApplyMapping;
import com.labelhub.infra.business.llm.support.LlmSuggestSchemaSupport.LlmFieldConfig;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

/** 服务端组装 LLM 提示词，与前端 buildLlmSuggestUserPrompt 行为对齐。 */
public final class LlmSuggestPromptSupport {

    public static final String DEFAULT_SYSTEM_PROMPT =
            "你是标注辅助助手。请根据题面与已填字段给出简洁、可执行的建议，不替用户做最终判断。";

    public static final String DEFAULT_USER_PROMPT_TEMPLATE =
            "请根据题面数据直接回答标注任务，给出可参考意见。";

    private static final Pattern TEMPLATE_VAR = Pattern.compile("\\{\\{\\s*([^{}\\s]+)\\s*\\}\\}");

    public record AssembledPrompt(
            String systemPrompt,
            String userPrompt,
            boolean agentMode,
            List<LlmApplyMapping> applyMappings,
            int contextFieldCount,
            Map<String, Object> outputJsonSchema) {
    }

    private LlmSuggestPromptSupport() {
    }

    private static boolean useCustomAgentSuffix(LlmFieldConfig fieldConfig) {
        if (fieldConfig == null || !StringUtils.hasText(fieldConfig.agentPromptSuffix())) {
            return false;
        }
        if (!StringUtils.hasText(fieldConfig.configMode())) {
            return true;
        }
        return "pro".equalsIgnoreCase(fieldConfig.configMode().trim());
    }

    public static AssembledPrompt assemble(
            ObjectMapper objectMapper,
            String schemaJson,
            LlmFieldConfig fieldConfig,
            Map<String, Object> itemPayload,
            Map<String, Object> formValues) {
        Map<String, Object> schemaRoot = parseSchemaRoot(objectMapper, schemaJson);
        Map<String, Object> payload = itemPayload == null ? Map.of() : itemPayload;
        Map<String, Object> draft = formValues == null ? Map.of() : formValues;

        String userTemplate = StringUtils.hasText(fieldConfig.promptTemplate())
                ? fieldConfig.promptTemplate().trim()
                : DEFAULT_USER_PROMPT_TEMPLATE;
        String baseSystem = StringUtils.hasText(fieldConfig.systemPrompt())
                ? fieldConfig.systemPrompt().trim()
                : DEFAULT_SYSTEM_PROMPT;

        Map<String, Object> context = buildContext(schemaRoot, payload, draft);
        Set<String> templatePaths = extractTemplatePaths(userTemplate);
        List<DisplayField> displayFields = resolveDisplayFields(schemaRoot, fieldConfig);
        Set<String> contextFields = new LinkedHashSet<>(templatePaths);
        displayFields.forEach(field -> contextFields.add(field.path()));

        String userPrompt = renderTemplate(userTemplate, context);
        if (templatePaths.isEmpty() && !displayFields.isEmpty()) {
            String block = formatDisplayBlock(displayFields, context);
            if (StringUtils.hasText(block)) {
                userPrompt = (userPrompt.trim() + "\n\n" + block).trim();
            }
        }

        List<LlmApplyMapping> applyMappings = LlmAgentAssemblySupport.normalizeApplyMappings(
                schemaRoot, fieldConfig.applyMappings());
        boolean agentMode = LlmAgentPromptSupport.isAgentMode(fieldConfig.mode(), applyMappings);
        String customSuffix = useCustomAgentSuffix(fieldConfig) ? fieldConfig.agentPromptSuffix().trim() : null;
        String systemPrompt = agentMode
                ? LlmAgentAssemblySupport.augmentSystemPrompt(
                        baseSystem, schemaRoot, applyMappings, customSuffix)
                : baseSystem;
        Map<String, Object> outputJsonSchema = agentMode && !applyMappings.isEmpty()
                ? LlmAgentAssemblySupport.buildOutputSchema(objectMapper, schemaRoot, applyMappings)
                : Map.of();

        return new AssembledPrompt(
                systemPrompt,
                userPrompt.trim(),
                agentMode,
                applyMappings,
                contextFields.size(),
                outputJsonSchema);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> parseSchemaRoot(ObjectMapper objectMapper, String schemaJson) {
        if (objectMapper == null || !StringUtils.hasText(schemaJson)) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(schemaJson, Map.class);
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private record DisplayField(String path, String label) {
    }

    private static List<DisplayField> resolveDisplayFields(
            Map<String, Object> schemaRoot, LlmFieldConfig fieldConfig) {
        List<DisplayField> displayFields = collectDisplayFields(schemaRoot);
        if (!displayFields.isEmpty() || fieldConfig == null) {
            return displayFields;
        }
        List<String> configuredPaths = fieldConfig.contextFields();
        if (configuredPaths == null || configuredPaths.isEmpty()) {
            return displayFields;
        }
        List<DisplayField> fallback = new ArrayList<>();
        for (String path : configuredPaths) {
            if (!StringUtils.hasText(path)) {
                continue;
            }
            String trimmed = path.trim();
            String label = LlmSuggestSchemaSupport.findFieldByPathOrKey(schemaRoot, trimmed)
                    .map(field -> resolveLabel(field, trimmed))
                    .orElse(trimmed);
            fallback.add(new DisplayField(trimmed, label));
        }
        return fallback;
    }

    @SuppressWarnings("unchecked")
    private static List<DisplayField> collectDisplayFields(Map<String, Object> schemaRoot) {
        List<DisplayField> fields = new ArrayList<>();
        Object sectionsObj = schemaRoot.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return fields;
        }
        for (Object sectionObj : sections) {
            if (sectionObj instanceof Map<?, ?> section) {
                Object fieldsObj = section.get("fields");
                if (fieldsObj instanceof List<?> sectionFields) {
                    collectDisplayFieldsFromList(sectionFields, fields);
                }
            }
        }
        return fields;
    }

    @SuppressWarnings("unchecked")
    private static void collectDisplayFieldsFromList(List<?> fields, List<DisplayField> output) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            if ("display".equals(resolveImportRole(field)) && !isRuntimeField(field)) {
                String path = resolveBinding(field);
                if (StringUtils.hasText(path)) {
                    String label = resolveLabel(field, path);
                    output.add(new DisplayField(path, label));
                }
            }
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                collectDisplayFieldsFromList(nestedFields, output);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> buildContext(
            Map<String, Object> schemaRoot,
            Map<String, Object> itemPayload,
            Map<String, Object> formValues) {
        Map<String, Object> mapped = new LinkedHashMap<>(itemPayload);
        Object sectionsObj = schemaRoot.get("sections");
        if (sectionsObj instanceof List<?> sections) {
            for (Object sectionObj : sections) {
                if (sectionObj instanceof Map<?, ?> section) {
                    Object fieldsObj = section.get("fields");
                    if (fieldsObj instanceof List<?> fields) {
                        mapPayloadBindings(fields, itemPayload, mapped);
                    }
                }
            }
        }
        mergeInputFormValues(schemaRoot, mapped, formValues);
        return mapped;
    }

    @SuppressWarnings("unchecked")
    private static void mergeInputFormValues(
            Map<String, Object> schemaRoot,
            Map<String, Object> target,
            Map<String, Object> formValues) {
        if (formValues == null || formValues.isEmpty()) {
            return;
        }
        Object sectionsObj = schemaRoot.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return;
        }
        for (Object sectionObj : sections) {
            if (sectionObj instanceof Map<?, ?> section) {
                Object fieldsObj = section.get("fields");
                if (fieldsObj instanceof List<?> fields) {
                    mergeInputFormValuesFromList(fields, target, formValues);
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static void mergeInputFormValuesFromList(
            List<?> fields, Map<String, Object> target, Map<String, Object> formValues) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            String binding = resolveBinding(field);
            if (binding != null && "input".equals(resolveImportRole(field))) {
                Object value = getValueAtPath(formValues, binding);
                if (value != null) {
                    setValueAtPath(target, binding, value);
                }
            }
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                mergeInputFormValuesFromList(nestedFields, target, formValues);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static void mapPayloadBindings(
            List<?> fields, Map<String, Object> itemPayload, Map<String, Object> target) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            String binding = resolveBinding(field);
            if (binding != null && itemPayload.containsKey(binding)) {
                setValueAtPath(target, binding, itemPayload.get(binding));
            }
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                mapPayloadBindings(nestedFields, itemPayload, target);
            }
        }
    }

    private static void setValueAtPath(Map<String, Object> root, String path, Object value) {
        String[] parts = path.split("\\.");
        Map<String, Object> cursor = root;
        for (int i = 0; i < parts.length - 1; i++) {
            String part = parts[i];
            Object next = cursor.get(part);
            if (!(next instanceof Map<?, ?> nextMap)) {
                Map<String, Object> created = new LinkedHashMap<>();
                cursor.put(part, created);
                cursor = created;
            } else {
                @SuppressWarnings("unchecked")
                Map<String, Object> cast = (Map<String, Object>) nextMap;
                cursor = cast;
            }
        }
        cursor.put(parts[parts.length - 1], value);
    }

    private static Object getValueAtPath(Map<String, Object> root, String path) {
        Object current = root;
        for (String part : path.split("\\.")) {
            if (!(current instanceof Map<?, ?> map)) {
                return null;
            }
            current = map.get(part);
        }
        return current;
    }

    private static Set<String> extractTemplatePaths(String... templates) {
        Set<String> paths = new LinkedHashSet<>();
        for (String template : templates) {
            if (!StringUtils.hasText(template)) {
                continue;
            }
            Matcher matcher = TEMPLATE_VAR.matcher(template);
            while (matcher.find()) {
                String path = matcher.group(1);
                if (StringUtils.hasText(path)) {
                    paths.add(path.trim());
                }
            }
        }
        return paths;
    }

    private static String renderTemplate(String template, Map<String, Object> context) {
        Matcher matcher = TEMPLATE_VAR.matcher(template);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            String path = matcher.group(1).trim();
            Object value = getValueAtPath(context, path);
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(formatContextValue(value)));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private static String formatDisplayBlock(List<DisplayField> fields, Map<String, Object> context) {
        if (fields.isEmpty()) {
            return "";
        }
        List<String> lines = new ArrayList<>();
        for (DisplayField field : fields) {
            lines.add(field.label() + "：" + formatContextValue(getValueAtPath(context, field.path())));
        }
        return "【题面数据】\n" + String.join("\n", lines);
    }

    private static String formatContextValue(Object value) {
        if (value == null || "".equals(value)) {
            return "（空）";
        }
        if (value instanceof String || value instanceof Number || value instanceof Boolean) {
            return String.valueOf(value);
        }
        return String.valueOf(value);
    }

    @SuppressWarnings("unchecked")
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
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private static String resolveImportRole(Map<?, ?> field) {
        Object component = field.get("component");
        if (component != null) {
            String name = component.toString();
            if ("showItem".equals(name)) {
                String source = showItemContentSource(field);
                return source == null || "payload".equals(source) ? "display" : "runtime";
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
            if (role != null && StringUtils.hasText(role.toString())) {
                return role.toString().trim().toLowerCase();
            }
        }
        if (isRuntimeField(field)) {
            return "runtime";
        }
        Object readonly = field.get("readonly");
        if (readonly == null) {
            readonly = field.get("readOnly");
        }
        if (Boolean.TRUE.equals(readonly)) {
            return "display";
        }
        return resolveBinding(field) == null ? "" : "input";
    }

    @SuppressWarnings("unchecked")
    private static String showItemContentSource(Map<?, ?> field) {
        Object showItem = field.get("showItem");
        if (showItem instanceof Map<?, ?> map) {
            Object source = map.get("contentSource");
            return source == null ? "payload" : source.toString();
        }
        return "payload";
    }

    @SuppressWarnings("unchecked")
    private static String showAssetContentSource(Map<?, ?> field, String component) {
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

    private static String resolveBinding(Map<?, ?> field) {
        Object path = field.get("path");
        if (path != null && StringUtils.hasText(path.toString())) {
            return path.toString().trim();
        }
        Object key = field.get("key");
        if (key != null && StringUtils.hasText(key.toString())) {
            return key.toString().trim();
        }
        return null;
    }

    private static String resolveLabel(Map<?, ?> field, String fallback) {
        Object label = field.get("label");
        if (label != null && StringUtils.hasText(label.toString())) {
            return label.toString().trim();
        }
        return fallback;
    }
}
