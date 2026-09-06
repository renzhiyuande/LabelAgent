package com.labelhub.core.lowcode.form;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FormSchemaHtmlSanitizerTest {

    @Test
    @org.junit.jupiter.api.DisplayName("WB-LC-006: 含 script 标签时剥离危险 HTML")
    void sanitizeHtmlStripsScriptAndEventHandlers() {
        String sanitized = FormSchemaHtmlSanitizer.sanitizeHtml(
                "<p>ok</p><script>alert(1)</script><img src=\"x\" onerror=\"alert(1)\" alt=\"x\" />");
        assertTrue(sanitized.contains("<p>ok</p>"));
        assertFalse(sanitized.toLowerCase().contains("script"));
        assertFalse(sanitized.toLowerCase().contains("onerror"));
    }

    @Test
    void sanitizeAnnotatePayloadRewritesRichTextField() {
        Map<String, Object> schema = Map.of(
                "sections",
                List.of(Map.of(
                        "key",
                        "labeling",
                        "fields",
                        List.of(Map.of(
                                "key",
                                "note",
                                "path",
                                "note",
                                "label",
                                "备注",
                                "component",
                                "richText",
                                "meta",
                                Map.of("importRole", "input"))))));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("note", "<p>safe</p><iframe src=\"evil\"></iframe>");

        FormSchemaHtmlSanitizer.sanitizeAnnotatePayload(schema, payload);

        String note = String.valueOf(payload.get("note"));
        assertTrue(note.contains("<p>safe</p>"));
        assertFalse(note.toLowerCase().contains("iframe"));
    }

    @Test
    void rewriteAuthenticatedFileMediaUrls() {
        String sanitized = FormSchemaHtmlSanitizer.sanitizeHtml(
                "<img src=\"/api/v1/files/12/download\" alt=\"图\" />");
        assertTrue(sanitized.contains("data-lh-file-id=\"12\""));
        assertFalse(sanitized.contains("/api/v1/files/12/download"));
    }
}
