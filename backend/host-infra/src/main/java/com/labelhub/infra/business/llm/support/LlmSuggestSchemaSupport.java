package com.labelhub.infra.business.llm.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.LlmApplyMapping;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.util.StringUtils;

/**
 * 从模板 form schema 解析 llmSuggest 字段配置，
 * 与前端 {@code fieldCode}（通常为 path，亦兼容 key）对齐。
 */
public final class LlmSuggestSchemaSupport {

    public record LlmFieldBinding(String providerCode, String modelKey) {
    }

    /** 字段级 Provider 权重配置 */
    public record ProviderWeight(String code, String model, int weight) {
    }

    public record LlmFieldConfig(
            String providerCode,
            String modelKey,
            String mode,
            String configMode,
            String systemPrompt,
            String promptTemplate,
            String agentPromptSuffix,
            List<LlmApplyMapping> applyMappings,
            List<ProviderWeight> providers,
            List<String> contextFields,
            /** null 或未配置时视为允许重复生成，与前端 resolveLlmFieldConfig 一致 */
            Boolean allowRegenerate) {
    }

    private LlmSuggestSchemaSupport() {
    }

    public static Optional<LlmFieldConfig> findLlmFieldConfig(
            ObjectMapper objectMapper, String schemaJson, String fieldCode) {
        if (objectMapper == null || !StringUtils.hasText(schemaJson) || !StringUtils.hasText(fieldCode)) {
            return Optional.empty();
        }
        try {
            Map<String, Object> root = objectMapper.readValue(schemaJson, new TypeReference<>() {
            });
            return findLlmFieldConfig(root, fieldCode.trim());
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    @SuppressWarnings("unchecked")
    public static Optional<LlmFieldConfig> findLlmFieldConfig(Map<String, Object> schemaRoot, String fieldCode) {
        if (schemaRoot == null || schemaRoot.isEmpty() || !StringUtils.hasText(fieldCode)) {
            return Optional.empty();
        }
        Object sectionsObj = schemaRoot.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return Optional.empty();
        }
        for (Object sectionObj : sections) {
            if (!(sectionObj instanceof Map<?, ?> section)) {
                continue;
            }
            Object fieldsObj = section.get("fields");
            if (fieldsObj instanceof List<?> fields) {
                Optional<LlmFieldConfig> found = findLlmFieldConfigInFields(schemaRoot, fields, fieldCode.trim());
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        return Optional.empty();
    }

    public static Optional<LlmFieldBinding> findFieldLlmBinding(
            ObjectMapper objectMapper, String schemaJson, String fieldCode) {
        return findLlmFieldConfig(objectMapper, schemaJson, fieldCode)
                .map(config -> new LlmFieldBinding(config.providerCode(), config.modelKey()));
    }

    @SuppressWarnings("unchecked")
    private static Optional<LlmFieldConfig> findLlmFieldConfigInFields(
            Map<String, Object> schemaRoot, List<?> fields, String fieldCode) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            if (matchesFieldCode(field, fieldCode) && isLlmSuggestField(field)) {
                return Optional.of(extractLlmConfig(schemaRoot, field));
            }
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                Optional<LlmFieldConfig> found = findLlmFieldConfigInFields(schemaRoot, nestedFields, fieldCode);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        return Optional.empty();
    }

    @SuppressWarnings("unchecked")
    public static Optional<Map<String, Object>> findFieldByPathOrKey(
            Map<String, Object> schemaRoot, String pathOrKey) {
        if (schemaRoot == null || !StringUtils.hasText(pathOrKey)) {
            return Optional.empty();
        }
        Object sectionsObj = schemaRoot.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return Optional.empty();
        }
        for (Object sectionObj : sections) {
            if (!(sectionObj instanceof Map<?, ?> section)) {
                continue;
            }
            Object fieldsObj = section.get("fields");
            if (fieldsObj instanceof List<?> fields) {
                Optional<Map<String, Object>> found = findFieldInFields(fields, pathOrKey.trim());
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        return Optional.empty();
    }

    @SuppressWarnings("unchecked")
    private static Optional<Map<String, Object>> findFieldInFields(List<?> fields, String pathOrKey) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            if (matchesFieldCode(field, pathOrKey)) {
                return Optional.of((Map<String, Object>) field);
            }
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                Optional<Map<String, Object>> found = findFieldInFields(nestedFields, pathOrKey);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        return Optional.empty();
    }

    private static boolean isLlmSuggestField(Map<?, ?> field) {
        Object component = field.get("component");
        return component != null && "llmSuggest".equalsIgnoreCase(component.toString().trim());
    }

    private static boolean matchesFieldCode(Map<?, ?> field, String fieldCode) {
        Object path = field.get("path");
        if (path != null && fieldCode.equals(path.toString().trim())) {
            return true;
        }
        Object key = field.get("key");
        return key != null && fieldCode.equals(key.toString().trim());
    }

    @SuppressWarnings("unchecked")
    private static LlmFieldConfig extractLlmConfig(Map<String, Object> schemaRoot, Map<?, ?> field) {
        Object llmObj = field.get("llm");
        String providerCode = null;
        String modelKey = null;
        String mode = null;
        String configMode = null;
        String systemPrompt = null;
        String promptTemplate = null;
        String agentPromptSuffix = null;
        List<LlmApplyMapping> applyMappings = List.of();
        List<ProviderWeight> providers = List.of();
        List<String> contextFields = List.of();
        Boolean allowRegenerate = null;
        if (llmObj instanceof Map<?, ?> llm) {
            providerCode = readText(llm.get("providerCode"));
            modelKey = readText(llm.get("modelKey"));
            // 优先解析 providers[] 数组（新格式）
            Object rawProviders = llm.get("providers");
            if (rawProviders instanceof List<?> providerList && !providerList.isEmpty()) {
                providers = readProviderWeights(providerList);
            }
            // 兼容旧格式：如果 providers 为空但有 providerCode+modelKey，包装为单元素列表
            if (providers.isEmpty() && providerCode != null && modelKey != null) {
                providers = List.of(new ProviderWeight(providerCode, modelKey, 1));
            }
            mode = readText(llm.get("mode"));
            configMode = readText(llm.get("configMode"));
            systemPrompt = readText(llm.get("systemPrompt"));
            promptTemplate = readText(llm.get("promptTemplate"));
            agentPromptSuffix = readText(llm.get("agentPromptSuffix"));
            List<String> applyTargets = readStringList(llm.get("applyTargets"));
            if (!applyTargets.isEmpty()) {
                applyMappings = applyTargets.stream()
                        .map(path -> new LlmApplyMapping(deriveSourceKey(schemaRoot, path), path))
                        .toList();
            } else {
                applyMappings = readApplyMappings(schemaRoot, llm.get("applyMappings"));
            }
            contextFields = readStringList(llm.get("contextFields"));
            allowRegenerate = readBooleanObject(llm.get("allowRegenerate"));
        }
        return new LlmFieldConfig(
                providerCode,
                modelKey,
                mode,
                configMode,
                systemPrompt,
                promptTemplate,
                agentPromptSuffix,
                applyMappings,
                providers,
                contextFields,
                allowRegenerate);
    }

    @SuppressWarnings("unchecked")
    private static List<ProviderWeight> readProviderWeights(List<?> rawList) {
        List<ProviderWeight> result = new ArrayList<>();
        for (Object item : rawList) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            String code = readText(map.get("code"));
            String model = readText(map.get("model"));
            if (code == null || model == null) {
                continue;
            }
            Object weightObj = map.get("weight");
            int weight = 1;
            if (weightObj instanceof Number n) {
                weight = Math.max(1, n.intValue());
            }
            result.add(new ProviderWeight(code, model, weight));
        }
        return Collections.unmodifiableList(result);
    }

    private static List<String> readStringList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        for (Object item : list) {
            if (item != null && StringUtils.hasText(item.toString())) {
                values.add(item.toString().trim());
            }
        }
        return List.copyOf(values);
    }

    @SuppressWarnings("unchecked")
    private static List<LlmApplyMapping> readApplyMappings(Map<String, Object> schemaRoot, Object raw) {
        if (!(raw instanceof List<?> list) || list.isEmpty()) {
            return List.of();
        }
        List<LlmApplyMapping> mappings = new ArrayList<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            String targetPath = readText(map.get("targetPath"));
            if (!StringUtils.hasText(targetPath)) {
                targetPath = readText(map.get("to"));
            }
            if (!StringUtils.hasText(targetPath)) {
                continue;
            }
            String sourceKey = readText(map.get("sourceKey"));
            if (!StringUtils.hasText(sourceKey)) {
                sourceKey = readText(map.get("from"));
            }
            if (!StringUtils.hasText(sourceKey)) {
                sourceKey = deriveSourceKey(schemaRoot, targetPath);
            }
            mappings.add(new LlmApplyMapping(sourceKey, targetPath));
        }
        return List.copyOf(mappings);
    }

    public static String deriveSourceKey(Map<String, Object> schemaRoot, String targetPath) {
        return findFieldByPathOrKey(schemaRoot, targetPath)
                .map(field -> {
                    Object key = field.get("key");
                    if (key != null && StringUtils.hasText(key.toString())) {
                        return key.toString().trim();
                    }
                    return lastPathSegment(targetPath);
                })
                .orElseGet(() -> lastPathSegment(targetPath));
    }

    private static String lastPathSegment(String path) {
        if (!StringUtils.hasText(path)) {
            return "value";
        }
        String trimmed = path.trim();
        int dot = trimmed.lastIndexOf('.');
        return dot >= 0 ? trimmed.substring(dot + 1) : trimmed;
    }

    private static String readText(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private static Boolean readBooleanObject(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        String text = value.toString().trim();
        if ("true".equalsIgnoreCase(text)) {
            return true;
        }
        if ("false".equalsIgnoreCase(text)) {
            return false;
        }
        return null;
    }
}
