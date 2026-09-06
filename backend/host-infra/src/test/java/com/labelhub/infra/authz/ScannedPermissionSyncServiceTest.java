package com.labelhub.infra.authz;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.core.authz.export.ScannedPermissionManifest;
import com.labelhub.infra.persistence.entity.PermissionEntity;
import com.labelhub.infra.persistence.mapper.PermissionMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ScannedPermissionSyncServiceTest {

    @Mock
    private PermissionMapper permissionMapper;

    @InjectMocks
    private ScannedPermissionSyncService service;

    @Test
    void syncFromManifestInsertsMissingPermissionsOnly() {
        PermissionEntity existing = new PermissionEntity();
        existing.setPermissionCode("system:admin");
        when(permissionMapper.selectList(any())).thenReturn(List.of(existing));

        ScannedPermissionManifest manifest = new ScannedPermissionManifest(
                "2026-06-10T00:00:00Z",
                2,
                List.of(
                        new ScannedPermissionManifest.PermissionItem("system:admin", List.of("java:test")),
                        new ScannedPermissionManifest.PermissionItem("business:task:read", List.of("java:test"))));

        int inserted = service.syncFromManifest(manifest);

        assertEquals(1, inserted);
        ArgumentCaptor<PermissionEntity> captor = ArgumentCaptor.forClass(PermissionEntity.class);
        verify(permissionMapper).insert(captor.capture());
        assertEquals("business:task:read", captor.getValue().getPermissionCode());
        assertEquals("BUSINESS", captor.getValue().getModuleCode());
        assertEquals("Task Read", captor.getValue().getPermissionName());
    }

    @Test
    void syncFromManifestSkipsWhenManifestEmpty() {
        int inserted = service.syncFromManifest(new ScannedPermissionManifest("t", 0, List.of()));
        assertEquals(0, inserted);
        verify(permissionMapper, never()).insert(any(PermissionEntity.class));
    }
}
