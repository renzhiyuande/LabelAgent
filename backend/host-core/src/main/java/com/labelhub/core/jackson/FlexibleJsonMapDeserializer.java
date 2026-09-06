package com.labelhub.core.jackson;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Collections;
import java.util.Map;

/**
 * 兼容 JSON 对象与 JSON 字符串两种形式的 Map 字段（如前端 jsonEditor 提交的 "{}"）。
 */
public class FlexibleJsonMapDeserializer extends JsonDeserializer<Map<String, Object>> {
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    @Override
    public Map<String, Object> deserialize(JsonParser parser, DeserializationContext ctxt) throws IOException {
        JsonToken token = parser.currentToken();
        if (token == JsonToken.VALUE_NULL) {
            return null;
        }
        ObjectMapper mapper = (ObjectMapper) parser.getCodec();
        if (token == JsonToken.VALUE_STRING) {
            String text = parser.getValueAsString();
            if (text == null || text.isBlank()) {
                return Collections.emptyMap();
            }
            return mapper.readValue(text.trim(), MAP_TYPE);
        }
        return mapper.readValue(parser, MAP_TYPE);
    }
}
