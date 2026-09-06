package com.labelhub.infra.business.llm.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.LlmApplyMapping;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.util.StringUtils;

public final class LlmAgentAssemblySupport {

  /** json_object 降级时 Provider 常要求 prompt 含 json 字样；结构约束由 response_format 承担。 */
  private static final String AGENT_JSON_HINT =
      "\n\n【输出格式】请输出 json 对象，字段结构由 response_format 约束，不要 Markdown 代码块或额外说明。";

  private LlmAgentAssemblySupport() {}

  public static List<LlmApplyMapping> normalizeApplyMappings(
      Map<String, Object> schemaRoot, List<LlmApplyMapping> raw) {
    if (raw == null || raw.isEmpty()) {
      return List.of();
    }
    List<LlmApplyMapping> normalized = new ArrayList<>();
    Set<String> seen = new LinkedHashSet<>();
    for (LlmApplyMapping mapping : raw) {
      if (mapping == null || !StringUtils.hasText(mapping.targetPath())) {
        continue;
      }
      String targetPath = mapping.targetPath().trim();
      String sourceKey =
          StringUtils.hasText(mapping.sourceKey())
              ? mapping.sourceKey().trim()
              : LlmSuggestSchemaSupport.deriveSourceKey(schemaRoot, targetPath);
      String dedupeKey = sourceKey + "->" + targetPath;
      if (!seen.add(dedupeKey)) {
        continue;
      }
      normalized.add(new LlmApplyMapping(sourceKey, targetPath));
    }
    return List.copyOf(normalized);
  }

  public static String augmentSystemPrompt(
      String systemPrompt,
      Map<String, Object> schemaRoot,
      List<LlmApplyMapping> applyMappings,
      String customSuffix) {
    if (StringUtils.hasText(customSuffix)) {
      return joinPrompt(systemPrompt, customSuffix.trim());
    }
    return augmentSystemPromptForAgent(systemPrompt, applyMappings);
  }

  public static String augmentSystemPromptForAgent(
      String systemPrompt, List<LlmApplyMapping> applyMappings) {
    if (applyMappings == null || applyMappings.isEmpty()) {
      return systemPrompt == null ? "" : systemPrompt.trim();
    }
    return joinPrompt(systemPrompt, AGENT_JSON_HINT);
  }

  public static Map<String, Object> buildOutputSchema(
      ObjectMapper objectMapper,
      Map<String, Object> schemaRoot,
      List<LlmApplyMapping> applyMappings) {
    Map<String, Object> properties = new LinkedHashMap<>();
    List<String> required = new ArrayList<>();
    for (LlmApplyMapping mapping : applyMappings) {
      if (mapping == null || !StringUtils.hasText(mapping.sourceKey())) {
        continue;
      }
      String sourceKey = mapping.sourceKey().trim();
      Map<String, Object> property = new LinkedHashMap<>();
      LlmSuggestSchemaSupport.findFieldByPathOrKey(schemaRoot, mapping.targetPath())
          .ifPresent(field -> applyFieldPropertyHints(property, field));
      properties.put(sourceKey, property);
      required.add(sourceKey);
    }
    if (properties.isEmpty()) {
      return Map.of();
    }
    Map<String, Object> schema = new LinkedHashMap<>();
    schema.put("type", "object");
    schema.put("additionalProperties", false);
    schema.put("properties", properties);
    schema.put("required", required);
    return schema;
  }

  @SuppressWarnings("unchecked")
  private static void applyFieldPropertyHints(Map<String, Object> property, Map<String, Object> field) {
    Object label = field.get("label");
    if (label != null && StringUtils.hasText(label.toString())) {
      property.put("description", label.toString().trim());
    }
    String component = field.get("component") == null ? "" : field.get("component").toString().trim().toLowerCase();
    switch (component) {
      case "number", "slider", "rate" -> property.put("type", "number");
      case "switch" -> property.put("type", "boolean");
      case "multiselect", "checkboxgroup" -> {
        property.put("type", "array");
        property.put("items", Map.of("type", "string"));
      }
      case "select", "radio", "dicttagpreview" -> {
        property.put("type", "string");
        List<String> enumValues = readOptionValues(field.get("options"));
        if (!enumValues.isEmpty()) {
          property.put("enum", enumValues);
        }
      }
      default -> property.put("type", "string");
    }
  }

  @SuppressWarnings("unchecked")
  private static List<String> readOptionValues(Object optionsObj) {
    if (!(optionsObj instanceof List<?> list)) {
      return List.of();
    }
    List<String> values = new ArrayList<>();
    for (Object item : list) {
      if (item instanceof Map<?, ?> option) {
        Object value = option.get("value");
        if (value != null && StringUtils.hasText(value.toString())) {
          values.add(value.toString().trim());
        }
      }
    }
    return values;
  }

  private static String joinPrompt(String systemPrompt, String suffix) {
    if (!StringUtils.hasText(systemPrompt)) {
      return suffix.trim();
    }
    return systemPrompt.trim() + suffix;
  }
}
