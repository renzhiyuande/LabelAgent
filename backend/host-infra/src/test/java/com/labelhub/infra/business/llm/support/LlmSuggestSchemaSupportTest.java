package com.labelhub.infra.business.llm.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class LlmSuggestSchemaSupportTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @org.junit.jupiter.api.DisplayName("WB-XSYS-006: schema 中 llmSuggest 字段绑定解析")
    void findsBindingByPath() {
        String schemaJson = """
                {
                  "sections": [{
                    "fields": [{
                      "component": "llmSuggest",
                      "key": "aiReference",
                      "path": "runtime.ai_reference",
                      "llm": {
                        "providerCode": "doubao",
                        "modelKey": "doubao-pro"
                      }
                    }]
                  }]
                }
                """;

        var config = LlmSuggestSchemaSupport.findLlmFieldConfig(objectMapper, schemaJson, "runtime.ai_reference");

        assertTrue(config.isPresent());
        assertEquals("doubao", config.get().providerCode());
        assertEquals("doubao-pro", config.get().modelKey());
        assertEquals(0, config.get().applyMappings().size());
    }

    @Test
    void findsBindingByKey() {
        String schemaJson = """
                {
                  "sections": [{
                    "fields": [{
                      "component": "llmSuggest",
                      "key": "aiReference",
                      "path": "runtime.ai_reference",
                      "llm": {
                        "providerCode": "openai",
                        "modelKey": "gpt-4o"
                      }
                    }]
                  }]
                }
                """;

        var config = LlmSuggestSchemaSupport.findLlmFieldConfig(objectMapper, schemaJson, "aiReference");

        assertTrue(config.isPresent());
        assertEquals("openai", config.get().providerCode());
        assertEquals("gpt-4o", config.get().modelKey());
    }

    @Test
    void returnsEmptyWhenFieldMissing() {
        assertTrue(LlmSuggestSchemaSupport.findFieldLlmBinding(objectMapper, "{}", "missing").isEmpty());
    }

    @Test
    void derivesMappingsFromApplyTargets() {
        String schemaJson =
                """
                {
                  "sections": [{
                    "fields": [{
                      "component": "llmSuggest",
                      "key": "aiReference",
                      "path": "runtime.ai_reference",
                      "llm": {
                        "mode": "agent",
                        "applyTargets": ["result.preferred"]
                      }
                    }, {
                      "key": "preferred",
                      "path": "result.preferred",
                      "label": "更优项",
                      "component": "select"
                    }]
                  }]
                }
                """;

        var config = LlmSuggestSchemaSupport.findLlmFieldConfig(objectMapper, schemaJson, "runtime.ai_reference");

        assertTrue(config.isPresent());
        assertEquals(1, config.get().applyMappings().size());
        assertEquals("preferred", config.get().applyMappings().get(0).sourceKey());
        assertEquals("result.preferred", config.get().applyMappings().get(0).targetPath());
    }

    @Test
    void readsApplyMappingsFromLegacyFromToKeys() {
        String schemaJson =
                """
                {
                  "sections": [{
                    "fields": [{
                      "component": "llmSuggest",
                      "key": "aiStructured",
                      "path": "runtime.ai_structured",
                      "llm": {
                        "mode": "agent",
                        "applyMappings": [
                          {"from": "winner", "to": "result.preferred"},
                          {"from": "dimension_hints", "to": "result.dimensions"}
                        ]
                      }
                    }, {
                      "key": "preferred",
                      "path": "result.preferred",
                      "component": "radioGroup"
                    }, {
                      "key": "judgeDimensions",
                      "path": "result.dimensions",
                      "component": "checkboxGroup"
                    }]
                  }]
                }
                """;

        var config = LlmSuggestSchemaSupport.findLlmFieldConfig(objectMapper, schemaJson, "runtime.ai_structured");

        assertTrue(config.isPresent());
        assertEquals(2, config.get().applyMappings().size());
        assertEquals("winner", config.get().applyMappings().get(0).sourceKey());
        assertEquals("result.preferred", config.get().applyMappings().get(0).targetPath());
        assertEquals("dimension_hints", config.get().applyMappings().get(1).sourceKey());
        assertEquals("result.dimensions", config.get().applyMappings().get(1).targetPath());
    }

    @Test
    void readsAllowRegenerateFlag() {
        String schemaJson = """
                {
                  "sections": [{
                    "fields": [{
                      "component": "llmSuggest",
                      "key": "aiReference",
                      "path": "runtime.ai_reference",
                      "llm": {
                        "allowRegenerate": false
                      }
                    }]
                  }]
                }
                """;

        var config = LlmSuggestSchemaSupport.findLlmFieldConfig(objectMapper, schemaJson, "runtime.ai_reference");

        assertTrue(config.isPresent());
        assertEquals(Boolean.FALSE, config.get().allowRegenerate());
    }
}
