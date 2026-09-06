package com.labelhub.infra.lowcode.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.labelhub.core.business.reward.FixedBonusRewardRuleConfig;
import com.labelhub.core.business.reward.PerApprovedRewardRuleConfig;
import com.labelhub.core.business.settings.TaskSettingsDocument;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SchemaIntrospectorTest {

    @Test
    void buildsTaskSettingsSchemaFromAnnotations() {
        Map<String, Object> schema = SchemaIntrospector.buildFormSchema(TaskSettingsDocument.class);

        assertEquals("任务设置", schema.get("title"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
        assertEquals(2, sections.size());
        assertEquals("submission", sections.get(0).get("key"));
        assertEquals("annotation", sections.get(1).get("key"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> submissionFields = (List<Map<String, Object>>) sections.get(0).get("fields");
        assertEquals(5, submissionFields.size());
        assertEquals("submission.withdraw.enabled", submissionFields.get(0).get("key"));
        assertEquals(true, submissionFields.get(0).get("defaultValue"));
        assertEquals("submission.appeal.appealWindowHours", submissionFields.get(4).get("key"));
        assertEquals(72, submissionFields.get(4).get("defaultValue"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> annotationFields = (List<Map<String, Object>>) sections.get(1).get("fields");
        assertEquals("allowTie", annotationFields.get(0).get("key"));
        assertEquals(false, annotationFields.get(0).get("defaultValue"));
    }

    @Test
    void buildsRewardRuleSchemaWithJsonKeys() {
        Map<String, Object> schema = SchemaIntrospector.buildFormSchema(PerApprovedRewardRuleConfig.class);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> fields = (List<Map<String, Object>>) sections.get(0).get("fields");

        assertEquals("base_amount", fields.get(2).get("key"));
        assertTrue((Boolean) fields.get(2).get("required"));
        assertEquals("settle_unit", fields.get(1).get("key"));
        assertEquals(true, fields.get(1).get("readonly"));
    }

    @Test
    void rewardRuleProvidersExposeModeKeysFromRootAnnotation() {
        assertEquals("PER_APPROVED", SchemaIntrospector.requireRoot(PerApprovedRewardRuleConfig.class).key());
        assertEquals("FIXED_BONUS", SchemaIntrospector.requireRoot(FixedBonusRewardRuleConfig.class).key());
        assertEquals("rewardRules", SchemaIntrospector.requireRoot(FixedBonusRewardRuleConfig.class).namespace());
    }

    @Test
    void taskSettingsSchemaDoesNotExposeHiddenFields() {
        Map<String, Object> schema = SchemaIntrospector.buildFormSchema(TaskSettingsDocument.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> submissionFields = (List<Map<String, Object>>) sections.get(0).get("fields");
        assertFalse(submissionFields.stream().anyMatch(field -> "allowedBeforeStatuses".equals(field.get("key"))));
    }
}
