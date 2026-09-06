package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.system.SystemDtos.PermissionCommand;
import com.labelhub.core.system.SystemDtos.PermissionSummary;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.system.admin.RolePermissionAdminService;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/admin/permissions")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminPermissionController {
    private final RolePermissionAdminService rolePermissionAdminService;

    public AdminPermissionController(RolePermissionAdminService rolePermissionAdminService) {
        this.rolePermissionAdminService = rolePermissionAdminService;
    }

    @GetMapping
    public ApiResponse<PageResponse<PermissionSummary>> permissions(@RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                                    @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_ADMIN_PAGE_SIZE) int pageSize,
                                                                    @RequestParam(required = false) String keyword) {
        return ok(rolePermissionAdminService.listPermissions(new PageQuery(page, pageSize, keyword)));
    }

    @GetMapping("/{id}")
    public ApiResponse<PermissionSummary> permission(@PathVariable Long id) {
        return ok(rolePermissionAdminService.getPermission(id));
    }

    @PostMapping
    public ApiResponse<PermissionSummary> createPermission(@Valid @RequestBody PermissionCommand command) {
        return ok(rolePermissionAdminService.createPermission(command));
    }

    @PutMapping("/{id}")
    public ApiResponse<PermissionSummary> updatePermission(@PathVariable Long id,
                                                           @Valid @RequestBody PermissionCommand command) {
        return ok(rolePermissionAdminService.updatePermission(id, command));
    }

    @PostMapping("/{id}/enable")
    public ApiResponse<Void> enablePermission(@PathVariable Long id) {
        rolePermissionAdminService.setPermissionStatus(id, "ACTIVE");
        return ok(null);
    }

    @PostMapping("/{id}/disable")
    public ApiResponse<Void> disablePermission(@PathVariable Long id) {
        rolePermissionAdminService.setPermissionStatus(id, "DISABLED");
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
