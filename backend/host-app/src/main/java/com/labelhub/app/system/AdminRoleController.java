package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.system.SystemDtos.AssignDataScopesCommand;
import com.labelhub.core.system.SystemDtos.AssignMenusCommand;
import com.labelhub.core.system.SystemDtos.AssignPermissionsCommand;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.system.SystemDtos.RoleCommand;
import com.labelhub.core.system.SystemDtos.RoleDataScopeSummary;
import com.labelhub.core.system.SystemDtos.RoleMenuAssignment;
import com.labelhub.core.system.SystemDtos.RolePermissionAssignment;
import com.labelhub.core.system.SystemDtos.RoleSummary;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.system.admin.DataScopeAdminService;
import com.labelhub.infra.system.admin.RolePermissionAdminService;
import java.util.List;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/roles")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminRoleController {
    private final RolePermissionAdminService rolePermissionAdminService;
    private final DataScopeAdminService dataScopeAdminService;

    public AdminRoleController(
            RolePermissionAdminService rolePermissionAdminService,
            DataScopeAdminService dataScopeAdminService) {
        this.rolePermissionAdminService = rolePermissionAdminService;
        this.dataScopeAdminService = dataScopeAdminService;
    }

    @GetMapping
    public ApiResponse<PageResponse<RoleSummary>> roles(@RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                        @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_ADMIN_PAGE_SIZE) int pageSize,
                                                        @RequestParam(required = false) String keyword) {
        return ok(rolePermissionAdminService.listRoles(new PageQuery(page, pageSize, keyword)));
    }

    @GetMapping("/{id}")
    public ApiResponse<RoleSummary> role(@PathVariable Long id) {
        return ok(rolePermissionAdminService.getRole(id));
    }

    @PostMapping
    public ApiResponse<RoleSummary> createRole(@Valid @RequestBody RoleCommand command) {
        return ok(rolePermissionAdminService.createRole(command));
    }

    @PutMapping("/{id}")
    public ApiResponse<RoleSummary> updateRole(@PathVariable Long id, @Valid @RequestBody RoleCommand command) {
        return ok(rolePermissionAdminService.updateRole(id, command));
    }

    @PostMapping("/{id}/enable")
    public ApiResponse<Void> enableRole(@PathVariable Long id) {
        rolePermissionAdminService.setRoleStatus(id, "ACTIVE");
        return ok(null);
    }

    @PostMapping("/{id}/disable")
    public ApiResponse<Void> disableRole(@PathVariable Long id) {
        rolePermissionAdminService.setRoleStatus(id, "DISABLED");
        return ok(null);
    }

    @PostMapping("/{id}/permissions")
    public ApiResponse<Void> assignRolePermissions(@PathVariable Long id,
                                                   @Valid @RequestBody AssignPermissionsCommand command) {
        rolePermissionAdminService.assignRolePermissions(id, command);
        return ok(null);
    }

    @PostMapping("/{id}/menus")
    public ApiResponse<Void> assignRoleMenus(@PathVariable Long id, @Valid @RequestBody AssignMenusCommand command) {
        rolePermissionAdminService.assignRoleMenus(id, command);
        return ok(null);
    }

    @GetMapping("/{id}/permissions")
    public ApiResponse<List<RolePermissionAssignment>> rolePermissions(@PathVariable Long id) {
        return ok(rolePermissionAdminService.getRolePermissionAssignments(id));
    }

    @GetMapping("/{id}/menus")
    public ApiResponse<List<RoleMenuAssignment>> roleMenus(@PathVariable Long id) {
        return ok(rolePermissionAdminService.getRoleMenuAssignments(id));
    }

    @GetMapping("/{id}/data-scopes")
    public ApiResponse<RoleDataScopeSummary> rolePolicies(@PathVariable Long id) {
        return ok(dataScopeAdminService.getRolePolicies(id));
    }

    @PostMapping("/{id}/data-scopes")
    public ApiResponse<Void> assignRolePolicies(@PathVariable Long id,
                                                @Valid @RequestBody AssignDataScopesCommand command) {
        dataScopeAdminService.assignRolePolicies(id, command);
        return ok(null);
    }

    @GetMapping("/{id}/data-scopes/{resourceType}")
    public ApiResponse<Map<String, Object>> describeResolvedScope(@PathVariable Long id,
                                                                  @PathVariable DataResourceType resourceType) {
        return ok(dataScopeAdminService.describeResolvedScope(id, resourceType));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
