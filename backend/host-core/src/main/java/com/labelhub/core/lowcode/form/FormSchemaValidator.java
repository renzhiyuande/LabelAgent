package com.labelhub.core.lowcode.form;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 通用模板 FormSchema 校验器：按 annotate 字段范围校验提交/草稿 payload。
 * 规则语义与前端 {@code collectResourceFormValidationErrors} 对齐。
 */
public final class FormSchemaValidator {

    private FormSchemaValidator() {
    }

    public static FormSchemaValidationResult validateAnnotatePayload(
            Map<String, Object> schemaRoot,
            Map<String, Object> payload,
            FormSchemaValidationOptions options) {
        FormSchemaValidationOptions resolved = options == null
                ? FormSchemaValidationOptions.forAssignment()
                : options;
        Map<String, Object> values = payload == null ? Map.of() : payload;
        Map<String, String> errors = new LinkedHashMap<>();
        for (Map<String, Object> field : FormSchemaAnnotateFieldSupport.collectAnnotateFields(schemaRoot)) {
            validateFieldTree(field, null, values, resolved, errors);
        }
        return FormSchemaValidationResult.of(errors);
    }

    public static void requireValidAnnotatePayload(
            Map<String, Object> schemaRoot,
            Map<String, Object> payload,
            FormSchemaValidationOptions options) {
        FormSchemaValidationResult result = validateAnnotatePayload(schemaRoot, payload, options);
        if (!result.isValid()) {
            String message = result.summaryMessage();
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    message == null ? "标注数据校验未通过" : message);
        }
    }

    @SuppressWarnings("unchecked")
    private static void validateFieldTree(
            Map<String, Object> field,
            String parentPath,
            Map<String, Object> rootValues,
            FormSchemaValidationOptions options,
            Map<String, String> errors) {
        String path = parentPath == null
                ? FormSchemaAnnotateFieldSupport.resolveBinding(field)
                : parentPath;
        if (path == null) {
            return;
        }
        Map<String, Object> contextValues = parentPath == null
                ? rootValues
                : FormSchemaJsonPaths.objectAtPath(rootValues, parentPath);

        if ("array".equalsIgnoreCase(String.valueOf(field.get("component")))) {
            validateArrayField(field, path, rootValues, options, errors);
            return;
        }

        if (!FormSchemaAnnotateFieldSupport.shouldValidateField(field, options, contextValues)) {
            return;
        }

        Object value = FormSchemaJsonPaths.readValue(rootValues, path);
        String error = FormSchemaFieldRuleValidator.validateField(field, value);
        if (error != null) {
            errors.put(path, error);
        }
    }

    @SuppressWarnings("unchecked")
    private static void validateArrayField(
            Map<String, Object> field,
            String path,
            Map<String, Object> rootValues,
            FormSchemaValidationOptions options,
            Map<String, String> errors) {
        if (!FormSchemaAnnotateFieldSupport.shouldValidateField(field, options, rootValues)) {
            return;
        }
        Object raw = FormSchemaJsonPaths.readValue(rootValues, path);
        List<?> items = raw instanceof List<?> list ? list : List.of();
        String arrayError = FormSchemaFieldRuleValidator.validateField(field, items);
        if (arrayError != null) {
            errors.put(path, arrayError);
        }
        Object nested = field.get("fields");
        if (!(nested instanceof List<?> childFields)) {
            return;
        }
        for (int index = 0; index < items.size(); index++) {
            String itemPath = path + "." + index;
            Map<String, Object> itemContext = FormSchemaJsonPaths.objectAtPath(rootValues, itemPath);
            for (Object childObj : childFields) {
                if (!(childObj instanceof Map<?, ?> childRaw)) {
                    continue;
                }
                Map<String, Object> childField = (Map<String, Object>) childRaw;
                String childBinding = FormSchemaAnnotateFieldSupport.resolveBinding(childField);
                if (childBinding == null) {
                    continue;
                }
                String childPath = itemPath + "." + childBinding;
                if (!FormSchemaAnnotateFieldSupport.shouldValidateField(childField, options, itemContext)) {
                    continue;
                }
                Object childValue = FormSchemaJsonPaths.readValue(rootValues, childPath);
                String childError = FormSchemaFieldRuleValidator.validateField(childField, childValue);
                if (childError != null) {
                    errors.put(childPath, childError);
                }
            }
        }
    }
}
