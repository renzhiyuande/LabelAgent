package com.labelhub.core.datapermission;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DataScopeCatalogTest {

    @Test
    void scopeTypesForFileIncludePublicOrOwn() {
        assertEquals(
                List.of("ALL", "CREATED_BY_ME", "PUBLIC_OR_OWN"),
                DataScopeCatalog.scopeTypesFor(DataResourceType.FILE).stream()
                        .map(DataScopeCatalog.LabeledOption::value)
                        .toList());
    }

    @Test
    void rejectsUnsupportedScopeType() {
        BusinessException error = assertThrows(
                BusinessException.class,
                () -> DataScopeCatalog.ensureSupported(DataResourceType.FILE, DataScopeType.TASK_OWNER));
        assertEquals(ErrorCode.VALIDATION_ERROR, error.errorCode());
    }
}
