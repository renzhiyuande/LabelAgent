package com.labelhub.core.lowcode.form;

import java.util.List;
import java.util.Map;

/** 与前端 {@code evaluateConditions} 对齐的 visibleWhen / disabledWhen 求值。 */
final class FormSchemaConditionEvaluator {

    private FormSchemaConditionEvaluator() {
    }

    static boolean evaluateAll(Map<String, Object> values, Object conditionsObj) {
        if (!(conditionsObj instanceof List<?> conditions) || conditions.isEmpty()) {
            return true;
        }
        for (Object item : conditions) {
            if (!(item instanceof Map<?, ?> condition)) {
                continue;
            }
            if (!evaluateOne(values, condition)) {
                return false;
            }
        }
        return true;
    }

    @SuppressWarnings("unchecked")
    private static boolean evaluateOne(Map<String, Object> values, Map<?, ?> condition) {
        Object fieldObj = condition.get("field");
        if (fieldObj == null) {
            return true;
        }
        String field = fieldObj.toString();
        Object current = FormSchemaJsonPaths.readValue(values, field);
        Object expected = condition.get("value");
        String operator = condition.get("operator") == null ? "eq" : condition.get("operator").toString();
        return switch (operator) {
            case "ne" -> !valuesEqual(current, expected);
            case "in" -> expected instanceof List<?> list && listContains(list, current);
            case "notIn" -> expected instanceof List<?> list && !listContains(list, current);
            case "contains" -> containsValue(current, expected);
            case "eq" -> valuesEqual(current, expected);
            default -> valuesEqual(current, expected);
        };
    }

    private static boolean valuesEqual(Object current, Object expected) {
        if (current == null && expected == null) {
            return true;
        }
        if (current == null || expected == null) {
            return false;
        }
        if (current instanceof Number currentNum && expected instanceof Number expectedNum) {
            return currentNum.doubleValue() == expectedNum.doubleValue();
        }
        return current.toString().equals(expected.toString());
    }

    private static boolean listContains(List<?> list, Object current) {
        for (Object item : list) {
            if (valuesEqual(item, current)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsValue(Object current, Object expected) {
        if (current instanceof List<?> list) {
            return listContains(list, expected);
        }
        if (current instanceof String text) {
            return text.contains(String.valueOf(expected));
        }
        return false;
    }
}
