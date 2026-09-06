package com.labelhub.infra.business.display.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.util.StringUtils;

/**
 * 向标注员/审核员等运行时客户端下发 form schema 时，剥离 LLM 敏感配置。
 */
public final class FormSchemaRuntimeSanitizer {

    /** 标注/审核运行时不下发：模型凭证、完整提示词与映射（均由服务端组装）。 */
    private static final Set<String> SENSITIVE_LLM_KEYS = Set.of(
            "providerCode",
            "modelKey",
            "systemPrompt",
            "promptTemplate",
            "applyMappings",
            "applyTargets",
            "agentPromptSuffix",
            "contextFields",
            "configMode");

    private FormSchemaRuntimeSanitizer() {
    }

    public static String sanitizeForClient(ObjectMapper objectMapper, String schemaJson) {
        if (objectMapper == null || !StringUtils.hasText(schemaJson)) {
            return schemaJson;
        }
        try {
            Map<String, Object> root = objectMapper.readValue(schemaJson, new TypeReference<>() {
            });
            sanitizeRoot(root);
            return objectMapper.writeValueAsString(root);
        } catch (Exception ignored) {
            return schemaJson;
        }
    }

    @SuppressWarnings("unchecked")
    private static void sanitizeRoot(Map<String, Object> root) {
        Object sectionsObj = root.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return;
        }
        for (Object sectionObj : sections) {
            if (!(sectionObj instanceof Map<?, ?> section)) {
                continue;
            }
            Object fieldsObj = section.get("fields");
            if (fieldsObj instanceof List<?> fields) {
                sanitizeFields(fields);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static void sanitizeFields(List<?> fields) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> rawField)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> field = (Map<String, Object>) rawField;
            sanitizeLlmMeta(field);
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                sanitizeFields(nestedFields);
            }
        }
    }

    private static void sanitizeLlmMeta(Map<String, Object> field) {
        Object component = field.get("component");
        if (component == null || !"llmSuggest".equalsIgnoreCase(component.toString().trim())) {
            return;
        }
        Object llmObj = field.get("llm");
        if (!(llmObj instanceof Map<?, ?> llm)) {
            return;
        }
        Map<String, Object> sanitized = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : llm.entrySet()) {
            if (entry.getKey() == null) {
                continue;
            }
            String key = entry.getKey().toString();
            if (!SENSITIVE_LLM_KEYS.contains(key)) {
                sanitized.put(key, entry.getValue());
            }
        }
        field.put("llm", sanitized);
    }
}
