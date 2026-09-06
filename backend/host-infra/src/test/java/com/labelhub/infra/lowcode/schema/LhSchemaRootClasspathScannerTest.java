package com.labelhub.infra.lowcode.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.labelhub.core.business.review.ReviewWorkflowDocument;
import com.labelhub.core.business.reward.FixedBonusRewardRuleConfig;
import com.labelhub.core.business.reward.PerApprovedRewardRuleConfig;
import com.labelhub.core.business.settings.TaskSettingsDocument;
import java.util.List;
import org.junit.jupiter.api.Test;

class LhSchemaRootClasspathScannerTest {

    @Test
    void scansAnnotatedSchemaRecordsFromCorePackages() {
        List<Class<?>> schemaClasses = LhSchemaRootClasspathScanner.scan();

        assertEquals(4, schemaClasses.size());
        assertTrue(schemaClasses.contains(TaskSettingsDocument.class));
        assertTrue(schemaClasses.contains(ReviewWorkflowDocument.class));
        assertTrue(schemaClasses.contains(PerApprovedRewardRuleConfig.class));
        assertTrue(schemaClasses.contains(FixedBonusRewardRuleConfig.class));
    }

    @Test
    void validatesUniqueNamespaceAndKey() {
        assertDoesNotThrow(() -> LhSchemaRootClasspathScanner.validateUniqueKeys(LhSchemaRootClasspathScanner.scan()));
    }

    @Test
    void rejectsDuplicateNamespaceAndKey() {
        IllegalStateException error = assertThrows(IllegalStateException.class, () ->
                LhSchemaRootClasspathScanner.validateUniqueKeys(List.of(
                        PerApprovedRewardRuleConfig.class,
                        PerApprovedRewardRuleConfig.class)));

        assertTrue(error.getMessage().contains("Duplicate @LhSchemaRoot registrations"));
        assertTrue(error.getMessage().contains("rewardRules/PER_APPROVED"));
    }

    @Test
    void scannedSchemasExposeExpectedProviderMetadata() {
        SchemaRemoteSchemaProvider taskSettingsProvider = new SchemaRemoteSchemaProvider(TaskSettingsDocument.class);
        SchemaRemoteSchemaProvider perApprovedProvider =
                new SchemaRemoteSchemaProvider(PerApprovedRewardRuleConfig.class);

        assertEquals("taskSettings", taskSettingsProvider.namespace());
        assertEquals("default", taskSettingsProvider.key());
        assertEquals("rewardRules", perApprovedProvider.namespace());
        assertEquals("PER_APPROVED", perApprovedProvider.key());
        assertFalse(taskSettingsProvider.formSchema().isEmpty());
    }

    private static void assertDoesNotThrow(Runnable runnable) {
        runnable.run();
    }
}
