package com.labelhub.infra.lowcode.schema;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.lowcode.schema.LhSchemaArray;
import com.labelhub.core.lowcode.schema.LhSchemaComponent;
import com.labelhub.core.lowcode.schema.LhSchemaField;
import com.labelhub.core.lowcode.schema.LhSchemaNested;
import com.labelhub.core.lowcode.schema.LhSchemaOption;
import com.labelhub.core.lowcode.schema.LhSchemaRoot;
import com.labelhub.core.lowcode.schema.LhSchemaRule;
import com.labelhub.core.lowcode.schema.LhSchemaSection;
import com.labelhub.core.lowcode.schema.LhSchemaSections;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class SchemaIntrospector {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private SchemaIntrospector() {
    }

    public static LhSchemaRoot requireRoot(Class<?> schemaClass) {
        LhSchemaRoot root = schemaClass.getAnnotation(LhSchemaRoot.class);
        if (root == null) {
            throw new IllegalArgumentException("Missing @LhSchemaRoot on " + schemaClass.getName());
        }
        return root;
    }

    public static Map<String, Object> buildFormSchema(Class<?> schemaClass) {
        LhSchemaRoot root = requireRoot(schemaClass);
        Map<String, SectionAccumulator> sections = new LinkedHashMap<>();
        registerSectionDefinitions(schemaClass, sections);
        collectFields(schemaClass, "", null, sections);
        return Map.of(
                "title", blankToDefault(root.title(), root.label()),
                "description", root.description(),
                "sections", buildSectionList(sections),
                "actions", List.of());
    }

    private static void registerSectionDefinitions(Class<?> schemaClass, Map<String, SectionAccumulator> sections) {
        LhSchemaSections sectionDefinitions = schemaClass.getAnnotation(LhSchemaSections.class);
        if (sectionDefinitions == null) {
            return;
        }
        for (LhSchemaSection section : sectionDefinitions.value()) {
            sections.putIfAbsent(section.key(), new SectionAccumulator(section.key(), section.title()));
        }
    }

    private static void collectFields(
            Class<?> schemaClass,
            String pathPrefix,
            String sectionKey,
            Map<String, SectionAccumulator> sections) {
        if (!schemaClass.isRecord()) {
            throw new IllegalArgumentException("Schema class must be a record: " + schemaClass.getName());
        }
        for (RecordComponent component : schemaClass.getRecordComponents()) {
            Class<?> componentType = component.getType();
            LhSchemaArray array = component.getAnnotation(LhSchemaArray.class);
            if (array != null) {
                LhSchemaField field = component.getAnnotation(LhSchemaField.class);
                if (field != null && !field.visible()) {
                    continue;
                }
                String fieldKey = resolveFieldKey(pathPrefix, component.getName(), field);
                String targetSection = resolveSectionKey(field, sectionKey);
                SectionAccumulator section = sections.computeIfAbsent(
                        targetSection, key -> new SectionAccumulator(key, targetSectionTitle(schemaClass, key)));
                section.fields().add(buildArrayField(fieldKey, field, array));
                continue;
            }
            LhSchemaNested nested = component.getAnnotation(LhSchemaNested.class);
            if (nested != null && componentType.isRecord()) {
                String nestedPrefix = pathPrefix.isEmpty()
                        ? component.getName() + "."
                        : pathPrefix + component.getName() + ".";
                collectFields(componentType, nestedPrefix, nested.sectionKey(), sections);
                continue;
            }
            if (componentType.isRecord() && !isSimpleType(componentType)) {
                String nestedPrefix = pathPrefix.isEmpty()
                        ? component.getName() + "."
                        : pathPrefix + component.getName() + ".";
                collectFields(componentType, nestedPrefix, sectionKey, sections);
                continue;
            }
            LhSchemaField field = component.getAnnotation(LhSchemaField.class);
            if (field != null && !field.visible()) {
                continue;
            }
            String fieldKey = resolveFieldKey(pathPrefix, component.getName(), field);
            String targetSection = resolveSectionKey(field, sectionKey);
            SectionAccumulator section = sections.computeIfAbsent(
                    targetSection, key -> new SectionAccumulator(key, targetSectionTitle(schemaClass, key)));
            section.fields().add(buildField(fieldKey, field));
        }
    }

    private static String targetSectionTitle(Class<?> schemaClass, String sectionKey) {
        LhSchemaSections sectionDefinitions = schemaClass.getAnnotation(LhSchemaSections.class);
        if (sectionDefinitions != null) {
            for (LhSchemaSection section : sectionDefinitions.value()) {
                if (section.key().equals(sectionKey)) {
                    return section.title();
                }
            }
        }
        return sectionKey;
    }

    private static String resolveSectionKey(LhSchemaField field, String inheritedSectionKey) {
        if (field != null && !field.sectionKey().isBlank()) {
            return field.sectionKey();
        }
        if (inheritedSectionKey != null && !inheritedSectionKey.isBlank()) {
            return inheritedSectionKey;
        }
        return "default";
    }

    private static String resolveFieldKey(String pathPrefix, String componentName, LhSchemaField field) {
        if (field != null && !field.jsonKey().isBlank()) {
            return field.jsonKey();
        }
        return pathPrefix.isEmpty() ? componentName : pathPrefix + componentName;
    }

    private static Map<String, Object> buildArrayField(String key, LhSchemaField field, LhSchemaArray array) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("key", key);
        result.put("label", field == null ? key : field.label());
        result.put("component", LhSchemaComponent.ARRAY.name().toLowerCase());
        if (field != null) {
            if (field.required()) {
                result.put("required", true);
            }
            if (!field.description().isBlank()) {
                result.put("description", field.description());
            }
            if (!field.defaultValue().isBlank()) {
                result.put("defaultValue", parseJsonDefault(field.defaultValue()));
            }
        }
        result.put("fields", buildArrayItemFields(array.itemRecord()));
        return Map.copyOf(result);
    }

    private static List<Map<String, Object>> buildArrayItemFields(Class<?> itemRecord) {
        if (!itemRecord.isRecord()) {
            throw new IllegalArgumentException("Array item type must be a record: " + itemRecord.getName());
        }
        List<Map<String, Object>> fields = new ArrayList<>();
        for (RecordComponent component : itemRecord.getRecordComponents()) {
            LhSchemaField field = component.getAnnotation(LhSchemaField.class);
            if (field != null && !field.visible()) {
                continue;
            }
            String itemKey = component.getName();
            Map<String, Object> itemField = new LinkedHashMap<>(buildField(itemKey, field));
            itemField.put("path", itemKey);
            fields.add(Map.copyOf(itemField));
        }
        return List.copyOf(fields);
    }

    private static Object parseJsonDefault(String json) {
        try {
            return OBJECT_MAPPER.readValue(json, Object.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid JSON defaultValue: " + json, ex);
        }
    }

    private static Map<String, Object> buildField(String key, LhSchemaField field) {
        if (field == null) {
            return Map.of("key", key, "label", key, "component", "text");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("key", key);
        result.put("label", field.label());
        result.put("component", componentName(field.component()));
        if (!field.defaultValue().isBlank()) {
            result.put("defaultValue", coerceDefaultValue(field.defaultValue(), field.component()));
        }
        if (field.readonly()) {
            result.put("readonly", true);
        }
        if (field.required()) {
            result.put("required", true);
        }
        if (!field.description().isBlank()) {
            result.put("description", field.description());
        }
        if (field.options().length > 0) {
            result.put("options", buildOptions(field.options()));
        }
        if (field.rules().length > 0) {
            result.put("rules", buildRules(field.rules()));
        }
        return Map.copyOf(result);
    }

    private static List<Map<String, Object>> buildOptions(LhSchemaOption[] options) {
        List<Map<String, Object>> result = new ArrayList<>(options.length);
        for (LhSchemaOption option : options) {
            result.add(Map.of("label", option.label(), "value", option.value()));
        }
        return result;
    }

    private static List<Map<String, Object>> buildRules(LhSchemaRule[] rules) {
        List<Map<String, Object>> result = new ArrayList<>(rules.length);
        for (LhSchemaRule rule : rules) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", rule.type());
            item.put("value", coerceRuleValue(rule.value()));
            item.put("message", rule.message());
            result.add(Map.copyOf(item));
        }
        return result;
    }

    private static Object coerceRuleValue(String value) {
        if ("true".equalsIgnoreCase(value) || "false".equalsIgnoreCase(value)) {
            return Boolean.parseBoolean(value);
        }
        try {
            if (value.contains(".")) {
                return Double.parseDouble(value);
            }
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return value;
        }
    }

    private static String componentName(LhSchemaComponent component) {
        return switch (component) {
            case CHECKBOX_GROUP -> "checkboxGroup";
            case ARRAY -> "array";
            default -> component.name().toLowerCase();
        };
    }

    private static Object coerceDefaultValue(String defaultValue, LhSchemaComponent component) {
        return switch (component) {
            case SWITCH -> Boolean.parseBoolean(defaultValue);
            case NUMBER -> {
                try {
                    if (defaultValue.contains(".")) {
                        yield Double.parseDouble(defaultValue);
                    }
                    yield Integer.parseInt(defaultValue);
                } catch (NumberFormatException ex) {
                    yield defaultValue;
                }
            }
            default -> defaultValue;
        };
    }

    private static List<Map<String, Object>> buildSectionList(Map<String, SectionAccumulator> sections) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (SectionAccumulator section : sections.values()) {
            if (section.fields().isEmpty()) {
                continue;
            }
            result.add(Map.of(
                    "key", section.key(),
                    "title", section.title(),
                    "fields", List.copyOf(section.fields())));
        }
        return result;
    }

    private static boolean isSimpleType(Class<?> type) {
        return type.isPrimitive()
                || type == String.class
                || Number.class.isAssignableFrom(type)
                || type == Boolean.class
                || type == java.math.BigDecimal.class
                || type.isEnum();
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static final class SectionAccumulator {
        private final String key;
        private final String title;
        private final List<Map<String, Object>> fields = new ArrayList<>();

        private SectionAccumulator(String key, String title) {
            this.key = key;
            this.title = title;
        }

        private String key() {
            return key;
        }

        private String title() {
            return title;
        }

        private List<Map<String, Object>> fields() {
            return fields;
        }
    }
}
