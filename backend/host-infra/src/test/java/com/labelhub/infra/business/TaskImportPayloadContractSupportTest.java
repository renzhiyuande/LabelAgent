package com.labelhub.infra.business;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.ImportColumnBinding;
import com.labelhub.core.business.BusinessDtos.TaskImportPayloadContract;
import com.labelhub.core.error.BusinessException;
import com.labelhub.infra.business.task.support.TaskImportPayloadContractSupport;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TaskImportPayloadContractSupportTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void buildsContractFromColumnBindings() {
        TaskImportPayloadContract contract = TaskImportPayloadContractSupport.buildFromColumnBindings(List.of(
                new ImportColumnBinding("id", "display"),
                new ImportColumnBinding("prompt", "display"),
                new ImportColumnBinding("preferred", "input"),
                new ImportColumnBinding("noise", "ignore")));
        assertEquals(List.of("id", "prompt"), contract.requiredKeys());
        assertEquals(List.of("preferred"), contract.optionalKeys());
    }

    @Test
    void acceptsSubsetRows() {
        TaskImportPayloadContract contract = new TaskImportPayloadContract(1,
                List.of("id", "prompt"), List.of("preferred"), List.of(), null, "TEST");
        assertDoesNotThrow(() -> TaskImportPayloadContractSupport.assertRowsMatchContract(
                List.of(Map.of("id", "1", "prompt", "hi")), contract));
        assertDoesNotThrow(() -> TaskImportPayloadContractSupport.assertRowsMatchContract(
                List.of(Map.of("id", "1", "prompt", "hi", "preferred", "A")), contract));
    }

    @Test
    void rejectsMissingRequiredAndExtraColumns() {
        TaskImportPayloadContract contract = new TaskImportPayloadContract(1,
                List.of("id", "prompt"), List.of("preferred"), List.of(), null, "TEST");
        assertThrows(BusinessException.class, () -> TaskImportPayloadContractSupport.assertRowsMatchContract(
                List.of(Map.of("id", "1")), contract));
        assertThrows(BusinessException.class, () -> TaskImportPayloadContractSupport.assertRowsMatchContract(
                List.of(Map.of("id", "1", "prompt", "x", "unknown", "y")), contract));
    }

    @Test
    void filtersIgnoredAndOutOfContractColumns() {
        TaskImportPayloadContract contract = TaskImportPayloadContractSupport.buildFromColumnBindings(List.of(
                new ImportColumnBinding("id", "display"),
                new ImportColumnBinding("noise", "ignore")));
        Map<String, Object> filtered = TaskImportPayloadContractSupport.filterRowForContract(
                Map.of("id", "1", "noise", "drop", "extra", "x"), contract, null);
        assertEquals(Map.of("id", "1"), filtered);
    }

    @Test
    void rejectsTemplateSchemaMissingFrozenDisplayColumn() {
        TaskImportPayloadContract contract = new TaskImportPayloadContract(1,
                List.of("id", "prompt"), List.of(), List.of(), null, "TEST");
        Map<String, Object> schema = Map.of(
                "sections",
                List.of(Map.of(
                        "key",
                        "s1",
                        "fields",
                        List.of(Map.of(
                                "key",
                                "id",
                                "path",
                                "id",
                                "component",
                                "text",
                                "readonly",
                                true,
                                "meta",
                                Map.of("importRole", "display"))))));
        assertThrows(BusinessException.class,
                () -> TaskImportPayloadContractSupport.assertTemplateSchemaRespectsContract(
                        objectMapper, schema, contract));
    }
}
