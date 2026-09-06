package com.labelhub.infra.business.display.support;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class FormSchemaRuntimeSanitizerTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void stripsSensitiveLlmKeysFromLlmSuggestFields() throws Exception {
        String schemaJson = """
                {
                  "sections": [{
                    "fields": [{
                      "component": "llmSuggest",
                      "key": "aiReference",
                      "path": "runtime.ai_reference",
                      "llm": {
                        "providerCode": "doubao",
                        "modelKey": "doubao-pro",
                        "mode": "agent",
                        "buttonLabel": "生成 AI 参考",
                        "promptTemplate": "请比较回答"
                      }
                    }]
                  }]
                }
                """;

        String sanitized = FormSchemaRuntimeSanitizer.sanitizeForClient(objectMapper, schemaJson);
        var root = objectMapper.readTree(sanitized);
        var llm = root.path("sections").get(0).path("fields").get(0).path("llm");

        assertFalse(llm.has("providerCode"));
        assertFalse(llm.has("modelKey"));
        assertFalse(llm.has("promptTemplate"));
        assertFalse(llm.has("applyMappings"));
        assertTrue(llm.has("buttonLabel"));
        assertTrue(llm.has("mode"));
    }

    @Test
    void leavesNonLlmFieldsUntouched() {
        String schemaJson = """
                {
                  "sections": [{
                    "fields": [{
                      "component": "text",
                      "key": "title",
                      "llm": { "modelKey": "should-not-strip" }
                    }]
                  }]
                }
                """;

        String sanitized = FormSchemaRuntimeSanitizer.sanitizeForClient(objectMapper, schemaJson);
        assertTrue(sanitized.contains("should-not-strip"));
    }
}
