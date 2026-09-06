package com.labelhub.core.lowcode.form;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/** 与前端 {@code resource-form-validation} 对齐的单字段 rules 校验。 */
final class FormSchemaFieldRuleValidator {

    private FormSchemaFieldRuleValidator() {
    }

    static String validateField(Map<String, Object> field, Object value) {
        String label = FormSchemaAnnotateFieldSupport.resolveLabel(field, "字段");
        List<Map<String, Object>> rules = collectRules(field, label);
        for (Map<String, Object> rule : rules) {
            String error = validateRule(value, rule);
            if (error != null) {
                return error;
            }
        }
        String component = field.get("component") == null ? "" : field.get("component").toString();
        if (isJsonFieldComponent(component)) {
            String jsonError = validateJsonValue(value);
            if (jsonError != null) {
                return jsonError;
            }
        }
        String optionError = validateOptions(field, value);
        if (optionError != null) {
            return optionError;
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> collectRules(Map<String, Object> field, String label) {
        List<Map<String, Object>> rules = new java.util.ArrayList<>();
        if (Boolean.TRUE.equals(field.get("required"))) {
            rules.add(Map.of("type", "required", "message", "请填写" + label));
        }
        Object rulesObj = field.get("rules");
        if (rulesObj instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> raw) {
                    rules.add((Map<String, Object>) raw);
                }
            }
        }
        return rules;
    }

    private static String validateRule(Object value, Map<String, Object> rule) {
        String type = rule.get("type") == null ? "" : rule.get("type").toString();
        String message = rule.get("message") == null ? "校验未通过" : rule.get("message").toString();
        if ("required".equals(type)) {
            return isEmptyValue(value) ? message : null;
        }
        if (isEmptyValue(value)) {
            return null;
        }
        String textValue = value instanceof String string ? string : String.valueOf(value);
        double numericValue = value instanceof Number number ? number.doubleValue() : parseDouble(textValue);
        Object ruleValue = rule.get("value");
        return switch (type) {
            case "minLength" -> textValue.length() < toInt(ruleValue, 0) ? message : null;
            case "maxLength" -> textValue.length() > toInt(ruleValue, 0) ? message : null;
            case "min" -> Double.isNaN(numericValue) || numericValue < toDouble(ruleValue, 0) ? message : null;
            case "max" -> Double.isNaN(numericValue) || numericValue > toDouble(ruleValue, 0) ? message : null;
            case "pattern" -> validatePattern(textValue, ruleValue, message);
            case "email" -> EMAIL_PATTERN.matcher(textValue).matches() ? null : message;
            case "phone" -> PHONE_PATTERN.matcher(textValue).matches() ? null : message;
            default -> null;
        };
    }

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^1\\d{10}$");

    private static String validatePattern(String textValue, Object ruleValue, String message) {
        if (!(ruleValue instanceof String patternText) || patternText.isBlank()) {
            return null;
        }
        try {
            return Pattern.compile(patternText).matcher(textValue).matches() ? null : message;
        } catch (PatternSyntaxException ex) {
            return message;
        }
    }

    @SuppressWarnings("unchecked")
    private static String validateOptions(Map<String, Object> field, Object value) {
        if (isEmptyValue(value)) {
            return null;
        }
        Object optionsObj = field.get("options");
        if (!(optionsObj instanceof List<?> options) || options.isEmpty()) {
            return null;
        }
        java.util.Set<String> allowed = new java.util.HashSet<>();
        for (Object optionObj : options) {
            if (!(optionObj instanceof Map<?, ?> option)) {
                continue;
            }
            Object optionValue = option.get("value");
            if (optionValue != null) {
                allowed.add(String.valueOf(optionValue));
            }
        }
        if (value instanceof List<?> listValue) {
            boolean allAllowed = listValue.stream()
                    .filter(item -> item != null)
                    .map(String::valueOf)
                    .allMatch(allowed::contains);
            if (allAllowed) {
                return null;
            }
        } else {
            String text = value instanceof String string ? string.trim() : String.valueOf(value);
            if (allowed.contains(text)) {
                return null;
            }
        }
        String label = FormSchemaAnnotateFieldSupport.resolveLabel(field, "字段");
        return label + "取值不在允许范围内";
    }

    private static boolean isJsonFieldComponent(String component) {
        return "jsonEditor".equalsIgnoreCase(component) || "json".equalsIgnoreCase(component);
    }

    private static String validateJsonValue(Object value) {
        if (value == null || (value instanceof String string && string.isBlank())) {
            return null;
        }
        if (value instanceof Map<?, ?> || value instanceof List<?>) {
            return null;
        }
        if (value instanceof String text) {
            String trimmed = text.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                return null;
            }
            return "JSON 格式无效";
        }
        return null;
    }

    private static boolean isEmptyValue(Object value) {
        if (value == null) {
            return true;
        }
        if (value instanceof String string) {
            return string.trim().isEmpty();
        }
        if (value instanceof List<?> list) {
            return list.isEmpty();
        }
        if (value instanceof Map<?, ?> map) {
            return map.isEmpty();
        }
        return false;
    }

    private static int toInt(Object value, int defaultValue) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private static double toDouble(Object value, double defaultValue) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return parseDouble(String.valueOf(value));
    }

    private static double parseDouble(String text) {
        try {
            return Double.parseDouble(text);
        } catch (NumberFormatException ex) {
            return Double.NaN;
        }
    }
}
