package com.labelhub.infra.business.llm.support;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LlmStructuredResponseParserTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parsesPlainJsonObject() {
        Map<String, Object> parsed = LlmStructuredResponseParser.tryParseJsonObject(
                "{\"preferred\":\"A\",\"margin\":\"略优于\"}", objectMapper);
        assertEquals("A", parsed.get("preferred"));
        assertEquals("略优于", parsed.get("margin"));
    }

    @Test
    void parsesJsonFence() {
        Map<String, Object> parsed = LlmStructuredResponseParser.tryParseJsonObject(
                "说明如下：\n```json\n{\"winner\":\"B\"}\n```", objectMapper);
        assertEquals("B", parsed.get("winner"));
    }
}
