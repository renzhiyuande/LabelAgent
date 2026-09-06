package com.labelhub.app;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.labelhub.app.system.AdminRoleController;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.system.SystemDtos.AssignMenusCommand;
import com.labelhub.core.system.SystemDtos.AssignPermissionsCommand;
import com.labelhub.core.system.SystemDtos.RoleMenuAssignment;
import com.labelhub.core.system.SystemDtos.RolePermissionAssignment;
import com.labelhub.infra.system.admin.DataScopeAdminService;
import com.labelhub.infra.system.admin.RolePermissionAdminService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class AdminRoleControllerTest {

    @Mock
    private RolePermissionAdminService rolePermissionAdminService;

    @Mock
    private DataScopeAdminService dataScopeAdminService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new AdminRoleController(rolePermissionAdminService, dataScopeAdminService))
                .build();
    }

    @Test
    void rolePermissionAssignmentsUseUnifiedEnvelope() throws Exception {
        when(rolePermissionAdminService.getRolePermissionAssignments(7L)).thenReturn(List.of(
                new RolePermissionAssignment(11L, "system:admin", "System Administration")));

        mockMvc.perform(get("/api/v1/admin/roles/7/permissions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data[0].id").value(11))
                .andExpect(jsonPath("$.data[0].permissionCode").value("system:admin"))
                .andExpect(jsonPath("$.data[0].permissionName").value("System Administration"));
    }

    @Test
    void roleMenuAssignmentsUseUnifiedEnvelope() throws Exception {
        when(rolePermissionAdminService.getRoleMenuAssignments(7L)).thenReturn(List.of(
                new RoleMenuAssignment(21L, "system.users", "Users", "/system/users")));

        mockMvc.perform(get("/api/v1/admin/roles/7/menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data[0].id").value(21))
                .andExpect(jsonPath("$.data[0].menuCode").value("system.users"))
                .andExpect(jsonPath("$.data[0].menuName").value("Users"))
                .andExpect(jsonPath("$.data[0].path").value("/system/users"));
    }

    @Test
    void assignRolePermissionsDelegatesToService() throws Exception {
        mockMvc.perform(post("/api/v1/admin/roles/7/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "permissionIds": [11, 12]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        verify(rolePermissionAdminService).assignRolePermissions(eq(7L), any(AssignPermissionsCommand.class));
    }

    @Test
    void assignRoleMenusDelegatesToService() throws Exception {
        mockMvc.perform(post("/api/v1/admin/roles/7/menus")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "menuIds": [21, 22]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));

        verify(rolePermissionAdminService).assignRoleMenus(eq(7L), any(AssignMenusCommand.class));
    }
}
