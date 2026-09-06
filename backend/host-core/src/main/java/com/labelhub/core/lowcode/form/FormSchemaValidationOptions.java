package com.labelhub.core.lowcode.form;

/**
 * 与前端 {@code FormMode} 对齐的表单校验上下文。
 */
public record FormSchemaValidationOptions(String mode) {

    public static final String MODE_ASSIGNMENT = "assignment";

    public static FormSchemaValidationOptions forAssignment() {
        return new FormSchemaValidationOptions(MODE_ASSIGNMENT);
    }

    public String modeOrDefault() {
        return mode == null || mode.isBlank() ? MODE_ASSIGNMENT : mode.trim();
    }
}
