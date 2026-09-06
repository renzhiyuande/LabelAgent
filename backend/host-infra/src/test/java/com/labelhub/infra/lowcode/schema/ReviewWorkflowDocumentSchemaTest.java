package com.labelhub.infra.lowcode.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.labelhub.core.business.review.ReviewWorkflowDocument;
import com.labelhub.core.business.review.ReviewWorkflowSchemas;
import com.labelhub.core.lowcode.schema.LhSchemaRoot;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ReviewWorkflowDocumentSchemaTest {

    @Test
    void buildsReviewWorkflowSchemaFromAnnotations() {
        LhSchemaRoot root = SchemaIntrospector.requireRoot(ReviewWorkflowDocument.class);
        assertEquals(ReviewWorkflowSchemas.NAMESPACE, root.namespace());
        assertEquals("default", root.key());
        assertEquals("人工审核流程", root.label());

        Map<String, Object> schema = SchemaIntrospector.buildFormSchema(ReviewWorkflowDocument.class);
        assertEquals("人工审核流程", schema.get("title"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
        assertFalse(sections.isEmpty());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> fields = (List<Map<String, Object>>) sections.get(0).get("fields");
        assertEquals("levels", fields.get(0).get("key"));
        assertEquals("array", fields.get(0).get("component"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> itemFields = (List<Map<String, Object>>) fields.get(0).get("fields");
        assertEquals("label", itemFields.get(0).get("key"));
        assertEquals("checkboxGroup", itemFields.get(1).get("component"));
    }
}
