package com.labelhub.core.authz.export;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.labelhub.core.authz.ReviewerLevelPermissionCodes;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class PermissionCodeCollectorTest {

    @Test
    void collectIncludesKnownSystemAndBusinessPermissions() throws Exception {
        Path backendRoot = Path.of("..").toAbsolutePath().normalize();
        List<PermissionEntry> permissions = PermissionCodeCollector.collect(backendRoot);

        assertTrue(permissions.stream().anyMatch(entry -> "system:admin".equals(entry.code())));
        assertTrue(permissions.stream().anyMatch(entry -> "business:task:read".equals(entry.code())));
        assertTrue(permissions.stream().anyMatch(entry -> "system:data-scope:read".equals(entry.code())));
        assertTrue(permissions.stream().anyMatch(entry -> "system:dict:write".equals(entry.code())));
        for (String code : ReviewerLevelPermissionCodes.allCodes()) {
            assertTrue(
                    permissions.stream().anyMatch(entry -> code.equals(entry.code())),
                    () -> "missing reviewer level permission: " + code);
        }
        assertTrue(permissions.stream().anyMatch(entry -> entry.sources().stream()
                .anyMatch(source -> source.contains("ReviewerLevelPermissionCodes:registry"))));
        assertTrue(permissions.stream().noneMatch(entry -> entry.sources().stream().anyMatch(source -> source.startsWith("catalog:"))));
        assertTrue(permissions.stream().anyMatch(entry -> entry.sources().stream()
                .anyMatch(source -> source.contains(":requiredPermission"))));
    }
}
