package com.labelhub.core.authz.export;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class PermissionCodeMetadataTest {

    @Test
    void derivesModuleAndNameFromPermissionCode() {
        assertEquals("BUSINESS", PermissionCodeMetadata.moduleCode("business:task:read"));
        assertEquals("Task Read", PermissionCodeMetadata.permissionName("business:task:read"));
        assertEquals("Data Scope Read", PermissionCodeMetadata.permissionName("system:data-scope:read"));
        assertEquals("Reviewer Level L1", PermissionCodeMetadata.permissionName("business:reviewer:level:L1"));
    }
}
