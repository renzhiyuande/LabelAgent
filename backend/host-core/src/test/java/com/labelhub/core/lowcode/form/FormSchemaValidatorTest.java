package com.labelhub.core.lowcode.form;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.labelhub.core.error.BusinessException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FormSchemaValidatorTest {

    @Test
    @org.junit.jupiter.api.DisplayName("WB-LC-005: 缺 required 字段定义时校验失败")
    void validatesRequiredInputField() {
        Map<String, Object> schema = Map.of(
                "sections",
                List.of(Map.of(
                        "key",
                        "labeling",
                        "fields",
                        List.of(Map.of(
                                "key",
                                "preferred",
                                "path",
                                "result.preferred",
                                "label",
                                "偏好结论",
                                "component",
                                "radioGroup",
                                "required",
                                true,
                                "meta",
                                Map.of("importRole", "input"),
                                "options",
                                List.of(
                                        Map.of("label", "A 更优", "value", "A"),
                                        Map.of("label", "B 更优", "value", "B")))))));
        FormSchemaValidationResult invalid = FormSchemaValidator.validateAnnotatePayload(
                schema, Map.of(), FormSchemaValidationOptions.forAssignment());
        assertFalse(invalid.isValid());
        assertEquals("请填写偏好结论", invalid.fieldErrors().get("result.preferred"));

        FormSchemaValidationResult valid = FormSchemaValidator.validateAnnotatePayload(
                schema, Map.of("result", Map.of("preferred", "A")), FormSchemaValidationOptions.forAssignment());
        assertTrue(valid.isValid());
    }

    @Test
    void rejectsValueOutsideOptions() {
        Map<String, Object> schema = preferenceSchemaWithoutTie();
        FormSchemaValidationResult result = FormSchemaValidator.validateAnnotatePayload(
                schema,
                Map.of("result", Map.of("preferred", "tie")),
                FormSchemaValidationOptions.forAssignment());
        assertFalse(result.isValid());
        assertTrue(result.firstErrorMessage().contains("偏好结论"));
    }

    @Test
    void requireValidThrowsBusinessException() {
        Map<String, Object> schema = preferenceSchemaWithoutTie();
        assertThrows(
                BusinessException.class,
                () -> FormSchemaValidator.requireValidAnnotatePayload(
                        schema,
                        Map.of("result", Map.of("preferred", "tie")),
                        FormSchemaValidationOptions.forAssignment()));
    }

    @Test
    void acceptsCheckboxGroupArrayValuesWhenEachItemIsAllowed() {
        Map<String, Object> schema = Map.of(
                "sections",
                List.of(Map.of(
                        "key",
                        "labeling",
                        "fields",
                        List.of(Map.of(
                                "key",
                                "dimensions",
                                "path",
                                "result.dimensions",
                                "label",
                                "判断依据维度",
                                "component",
                                "checkboxGroup",
                                "required",
                                true,
                                "meta",
                                Map.of("importRole", "input"),
                                "options",
                                List.of(
                                        Map.of("label", "完整性", "value", "完整性"),
                                        Map.of("label", "准确性", "value", "准确性")))))));

        FormSchemaValidationResult valid = FormSchemaValidator.validateAnnotatePayload(
                schema,
                Map.of("result", Map.of("dimensions", List.of("完整性", "准确性"))),
                FormSchemaValidationOptions.forAssignment());
        assertTrue(valid.isValid());

        FormSchemaValidationResult invalid = FormSchemaValidator.validateAnnotatePayload(
                schema,
                Map.of("result", Map.of("dimensions", List.of("完整性", "不存在维度"))),
                FormSchemaValidationOptions.forAssignment());
        assertFalse(invalid.isValid());
        assertTrue(invalid.firstErrorMessage().contains("判断依据维度"));
    }

    @Test
    void skipsDisplayFields() {
        Map<String, Object> schema = Map.of(
                "sections",
                List.of(Map.of(
                        "key",
                        "context",
                        "fields",
                        List.of(Map.of(
                                "key",
                                "prompt",
                                "path",
                                "prompt",
                                "label",
                                "题干",
                                "component",
                                "showItem",
                                "meta",
                                Map.of("importRole", "display"))))));
        FormSchemaValidationResult result = FormSchemaValidator.validateAnnotatePayload(
                schema, Map.of(), FormSchemaValidationOptions.forAssignment());
        assertTrue(result.isValid());
    }

    private static Map<String, Object> preferenceSchemaWithoutTie() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put(
                "sections",
                List.of(Map.of(
                        "key",
                        "labeling",
                        "fields",
                        List.of(Map.of(
                                "key",
                                "preferred",
                                "path",
                                "result.preferred",
                                "label",
                                "偏好结论",
                                "component",
                                "radioGroup",
                                "required",
                                true,
                                "meta",
                                Map.of("importRole", "input"),
                                "options",
                                List.of(
                                        Map.of("label", "A 更优", "value", "A"),
                                        Map.of("label", "B 更优", "value", "B")))))));
        return schema;
    }
}
