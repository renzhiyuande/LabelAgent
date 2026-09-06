package com.labelhub.core.jackson;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.system.SystemDtos.LlmProviderCommand;
import org.junit.jupiter.api.Test;

class FlexibleJsonMapDeserializerTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deserializesConfigJsonObject() throws Exception {
        LlmProviderCommand command = objectMapper.readValue(
                """
                {
                  "providerName": "DeepSeek",
                  "providerCode": "deepseek",
                  "baseUrl": "https://api.deepseek.com",
                  "apiKey": "sk-test",
                  "configJson": {"timeout": 30}
                }
                """,
                LlmProviderCommand.class);

        assertEquals(30, command.configJson().get("timeout"));
    }

    @Test
    void deserializesConfigJsonString() throws Exception {
        LlmProviderCommand command = objectMapper.readValue(
                """
                {
                  "providerName": "DeepSeek",
                  "providerCode": "deepseek",
                  "baseUrl": "https://api.deepseek.com",
                  "apiKey": "sk-test",
                  "configJson": "{}"
                }
                """,
                LlmProviderCommand.class);

        assertEquals(0, command.configJson().size());
    }

    @Test
    void deserializesNullConfigJson() throws Exception {
        LlmProviderCommand command = objectMapper.readValue(
                """
                {
                  "providerName": "DeepSeek",
                  "providerCode": "deepseek",
                  "baseUrl": "https://api.deepseek.com",
                  "apiKey": "sk-test",
                  "configJson": null
                }
                """,
                LlmProviderCommand.class);

        assertNull(command.configJson());
    }
}
