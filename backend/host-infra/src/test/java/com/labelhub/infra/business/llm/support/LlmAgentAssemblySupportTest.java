package com.labelhub.infra.business.llm.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.LlmApplyMapping;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LlmAgentAssemblySupportTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @org.junit.jupiter.api.DisplayName("WB-XSYS-006: LLM 输出 schema 与 applyMappings 对齐")
    void buildsStrictOutputSchemaFromMappings() throws Exception {
        String schemaJson =
                """
                {
                  "sections": [{
                    "fields": [{
                      "key": "preferred",
                      "path": "result.preferred",
                      "label": "更优回答",
                      "component": "select"
                    }]
                  }]
                }
                """;
        Map<String, Object> schemaRoot = objectMapper.readValue(schemaJson, Map.class);
        Map<String, Object> outputSchema = LlmAgentAssemblySupport.buildOutputSchema(
                objectMapper,
                schemaRoot,
                List.of(new LlmApplyMapping("preferred", "result.preferred")));

        assertEquals("object", outputSchema.get("type"));
        assertEquals(false, outputSchema.get("additionalProperties"));
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) outputSchema.get("properties");
        assertTrue(properties.containsKey("preferred"));
        @SuppressWarnings("unchecked")
        Map<String, Object> preferred = (Map<String, Object>) properties.get("preferred");
        assertEquals("更优回答", preferred.get("description"));
        @SuppressWarnings("unchecked")
        List<String> required = (List<String>) outputSchema.get("required");
        assertEquals(List.of("preferred"), required);
    }

    @Test
    void buildsEnumForSelectField() throws Exception {
        String schemaJson =
                """
                {
                  "sections": [{
                    "fields": [{
                      "key": "preferred",
                      "path": "result.preferred",
                      "label": "更优回答",
                      "component": "select",
                      "options": [
                        { "value": "A", "label": "回答 A" },
                        { "value": "B", "label": "回答 B" }
                      ]
                    }]
                  }]
                }
                """;
        Map<String, Object> schemaRoot = objectMapper.readValue(schemaJson, Map.class);
        Map<String, Object> outputSchema = LlmAgentAssemblySupport.buildOutputSchema(
                objectMapper,
                schemaRoot,
                List.of(new LlmApplyMapping("preferred", "result.preferred")));

        @SuppressWarnings("unchecked")
        Map<String, Object> preferred =
                (Map<String, Object>) ((Map<String, Object>) outputSchema.get("properties")).get("preferred");
        assertEquals(List.of("A", "B"), preferred.get("enum"));
    }

    @Test
    void agentSystemPromptUsesJsonHintNotKeyList() {
        String prompt = LlmAgentAssemblySupport.augmentSystemPromptForAgent(
                "你是助手", List.of(new LlmApplyMapping("preferred", "result.preferred")));
        assertTrue(prompt.contains("json"));
        assertFalse(prompt.contains("preferred"));
    }
}
