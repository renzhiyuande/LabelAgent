package com.labelhub.core.lowcode.form;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** 按字段 path 聚合的 schema 校验结果。 */
public final class FormSchemaValidationResult {

    private final Map<String, String> fieldErrors;

    private FormSchemaValidationResult(Map<String, String> fieldErrors) {
        this.fieldErrors = fieldErrors == null ? Map.of() : Collections.unmodifiableMap(fieldErrors);
    }

    public static FormSchemaValidationResult valid() {
        return new FormSchemaValidationResult(Map.of());
    }

    public static FormSchemaValidationResult of(Map<String, String> fieldErrors) {
        if (fieldErrors == null || fieldErrors.isEmpty()) {
            return valid();
        }
        return new FormSchemaValidationResult(new LinkedHashMap<>(fieldErrors));
    }

    public boolean isValid() {
        return fieldErrors.isEmpty();
    }

    public Map<String, String> fieldErrors() {
        return fieldErrors;
    }

    public String firstErrorMessage() {
        return fieldErrors.values().stream().findFirst().orElse(null);
    }

    public String summaryMessage() {
        String first = firstErrorMessage();
        if (first == null) {
            return null;
        }
        int count = fieldErrors.size();
        return count > 1 ? first + "（共 " + count + " 处需修正）" : first;
    }
}
