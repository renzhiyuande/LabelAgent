package com.labelhub.infra.business.review.support;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReviewWorkflowValidatorTest {

    private ReviewWorkflowValidator validator;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        validator = new ReviewWorkflowValidator(objectMapper, new ReviewWorkflowResolver(objectMapper));
    }

    @Test
    void toJson_requiresSequentialKeys() {
        assertThrows(
                BusinessException.class,
                () -> validator.toJson(List.of(
                        new ReviewWorkflowLevel("L1", "初审", List.of("approve")),
                        new ReviewWorkflowLevel("L3", "终审", List.of("approve")))));
    }

    @Test
    void toJson_serializesValidWorkflow() {
        String json = validator.toJson(List.of(
                new ReviewWorkflowLevel("L1", "初审", List.of("approve", "reject")),
                new ReviewWorkflowLevel("L2", "复审", List.of("approve"))));
        assertTrue(json.contains("\"L1\""));
        assertTrue(json.contains("\"复审\""));
    }

    @Test
    void validateAndSerializeFromMap_assignsSequentialKeysWhenMissing() {
        String json = validator.validateAndSerializeFromMap(Map.of(
                "levels",
                List.of(
                        Map.of("label", "初审", "actions", List.of("approve", "reject", "return")),
                        Map.of("label", "复审", "actions", List.of("approve")))));
        assertTrue(json.contains("\"L1\""));
        assertTrue(json.contains("\"L2\""));
        assertTrue(json.contains("\"复审\""));
    }
}
