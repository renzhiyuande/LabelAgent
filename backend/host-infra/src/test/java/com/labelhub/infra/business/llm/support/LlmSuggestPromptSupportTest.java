package com.labelhub.infra.business.llm.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.business.llm.support.LlmSuggestSchemaSupport.LlmFieldConfig;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LlmSuggestPromptSupportTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void appendsShowItemPayloadFieldsWhenTemplateHasNoVariables() {
        String schemaJson = """
                {
                  "sections": [{
                    "fields": [
                      {
                        "key": "prompt",
                        "path": "prompt",
                        "label": "用户输入",
                        "component": "showItem",
                        "showItem": { "contentSource": "payload" },
                        "readonly": true
                      },
                      {
                        "key": "responseA",
                        "path": "response_a",
                        "label": "回答 A",
                        "component": "showItem",
                        "showItem": { "contentSource": "payload" },
                        "readonly": true
                      },
                      {
                        "key": "aiReference",
                        "path": "runtime.ai_reference",
                        "component": "llmSuggest",
                        "llm": {
                          "promptTemplate": "请比较回答 A 与 B，给出更优项、理由和安全风险提示。",
                          "contextFields": ["prompt", "response_a", "response_b"]
                        }
                      }
                    ]
                  }]
                }
                """;
        LlmFieldConfig fieldConfig = LlmSuggestSchemaSupport
                .findLlmFieldConfig(objectMapper, schemaJson, "runtime.ai_reference")
                .orElseThrow();
        Map<String, Object> itemPayload = Map.of(
                "prompt", "写一首关于春天的诗",
                "response_a", "春风拂面……",
                "response_b", "万物复苏……");

        var assembled = LlmSuggestPromptSupport.assemble(
                objectMapper, schemaJson, fieldConfig, itemPayload, Map.of());

        assertTrue(assembled.userPrompt().contains("【题面数据】"));
        assertTrue(assembled.userPrompt().contains("用户输入：写一首关于春天的诗"));
        assertTrue(assembled.userPrompt().contains("回答 A：春风拂面……"));
        assertEquals(2, assembled.contextFieldCount());
    }

    @Test
    void fallsBackToConfiguredContextFieldsWhenSchemaHasNoDisplayFields() {
        String schemaJson = """
                {
                  "sections": [{
                    "fields": [{
                      "key": "aiReference",
                      "path": "runtime.ai_reference",
                      "component": "llmSuggest",
                      "llm": {
                        "promptTemplate": "请比较回答 A 与 B。",
                        "contextFields": ["prompt", "response_a"]
                      }
                    }]
                  }]
                }
                """;
        LlmFieldConfig fieldConfig = LlmSuggestSchemaSupport
                .findLlmFieldConfig(objectMapper, schemaJson, "runtime.ai_reference")
                .orElseThrow();

        var assembled = LlmSuggestPromptSupport.assemble(
                objectMapper,
                schemaJson,
                fieldConfig,
                Map.of("prompt", "题目", "response_a", "答案 A"),
                Map.of());

        assertTrue(assembled.userPrompt().contains("【题面数据】"));
        assertTrue(assembled.userPrompt().contains("prompt：题目"));
        assertTrue(assembled.userPrompt().contains("response_a：答案 A"));
    }

    @Test
    void doesNotLetDraftEmptyDisplayFieldsOverwriteItemPayload() {
        String schemaJson = """
                {
                  "sections": [{
                    "fields": [
                      {
                        "key": "prompt",
                        "path": "prompt",
                        "label": "用户输入",
                        "component": "showItem",
                        "showItem": { "contentSource": "payload" }
                      },
                      {
                        "key": "responseA",
                        "path": "response_a",
                        "label": "回答 A",
                        "component": "showItem",
                        "showItem": { "contentSource": "payload" }
                      },
                      {
                        "key": "preferred",
                        "path": "result.preferred",
                        "label": "偏好",
                        "component": "select",
                        "meta": { "importRole": "input" }
                      },
                      {
                        "key": "aiReference",
                        "path": "runtime.ai_reference",
                        "component": "llmSuggest",
                        "llm": {
                          "promptTemplate": "请比较回答 A 与 B。"
                        }
                      }
                    ]
                  }]
                }
                """;
        LlmFieldConfig fieldConfig = LlmSuggestSchemaSupport
                .findLlmFieldConfig(objectMapper, schemaJson, "runtime.ai_reference")
                .orElseThrow();

        var assembled = LlmSuggestPromptSupport.assemble(
                objectMapper,
                schemaJson,
                fieldConfig,
                Map.of(
                        "prompt", "解释什么是过拟合",
                        "response_a", "过拟合指模型在训练集表现很好但泛化差。",
                        "response_b", "过拟合就是模型训练得太好了。"),
                Map.of(
                        "prompt", "",
                        "response_a", "",
                        "response_b", "",
                        "result.preferred", "A"));

        assertTrue(assembled.userPrompt().contains("用户输入：解释什么是过拟合"));
        assertTrue(assembled.userPrompt().contains("回答 A：过拟合指模型在训练集表现很好但泛化差。"));
    }
}
