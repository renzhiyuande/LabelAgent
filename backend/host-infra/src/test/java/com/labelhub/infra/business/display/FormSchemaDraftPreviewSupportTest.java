package com.labelhub.infra.business.display;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class FormSchemaDraftPreviewSupportTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void mapsInputFieldsUsingTemplateLabels() {
        String schema = """
                {
                  "sections": [{
                    "fields": [
                      {"key":"sentiment","label":"情感倾向","meta":{"importRole":"input"}},
                      {"key":"prompt","label":"题干","meta":{"importRole":"display"}}
                    ]
                  }]
                }
                """;
        String draft = "{\"sentiment\":\"正向\",\"prompt\":\"ignored\"}";

        String preview = FormSchemaDraftPreviewSupport.toPreviewText(objectMapper, schema, draft);

        assertThat(preview).isEqualTo("情感倾向: 正向");
    }

    @Test
    void skipsEmptyDraftValues() {
        String schema = """
                {
                  "sections": [{
                    "fields": [
                      {"key":"a","label":"字段A","meta":{"importRole":"input"}},
                      {"key":"b","label":"字段B","meta":{"importRole":"input"}}
                    ]
                  }]
                }
                """;
        String draft = "{\"a\":\"有值\",\"b\":\"\"}";

        String preview = FormSchemaDraftPreviewSupport.toPreviewText(objectMapper, schema, draft);

        assertThat(preview).isEqualTo("字段A: 有值");
    }

    @Test
    void formatsFileRefsUsingFileName() {
        String schema = """
                {
                  "sections": [{
                    "fields": [
                      {"key":"evidence","label":"证据素材","meta":{"importRole":"input"}}
                    ]
                  }]
                }
                """;
        String draft = """
                {
                  "evidence": {
                    "id": "2062841467357507586",
                    "name": "77.csv",
                    "size": 2881,
                    "mimeType": "text/csv"
                  }
                }
                """;

        String preview = FormSchemaDraftPreviewSupport.toPreviewText(objectMapper, schema, draft);

        assertThat(preview).isEqualTo("证据素材: 77.csv");
    }
}
