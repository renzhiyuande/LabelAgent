package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.system.SystemDtos.AssignRolesCommand;
import com.labelhub.core.system.SystemDtos.BatchAssignRolesCommand;
import com.labelhub.core.system.SystemDtos.BatchAssignRolesResult;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.system.SystemDtos.UserCommand;
import com.labelhub.core.system.SystemDtos.UserSummary;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.system.admin.UserAdminService;
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
@RequestMapping("/api/v1/admin/users")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminUserController {
    private final UserAdminService userAdminService;

    public AdminUserController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping
    public ApiResponse<PageResponse<UserSummary>> users(@RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                        @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_ADMIN_PAGE_SIZE) int pageSize,
                                                        @RequestParam(required = false) String keyword) {
        return ok(userAdminService.listUsers(new PageQuery(page, pageSize, keyword)));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserSummary> user(@PathVariable Long id) {
        return ok(userAdminService.getUser(id));
    }

    @PostMapping
    public ApiResponse<UserSummary> createUser(@Valid @RequestBody UserCommand command) {
        return ok(userAdminService.createUser(command));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserSummary> updateUser(@PathVariable Long id, @Valid @RequestBody UserCommand command) {
        return ok(userAdminService.updateUser(id, command));
    }

    @PostMapping("/{id}/enable")
    public ApiResponse<Void> enableUser(@PathVariable Long id) {
        userAdminService.setUserStatus(id, "ACTIVE");
        return ok(null);
    }

    @PostMapping("/{id}/disable")
    public ApiResponse<Void> disableUser(@PathVariable Long id) {
        userAdminService.setUserStatus(id, "DISABLED");
        return ok(null);
    }

    @PostMapping("/{id}/roles")
    public ApiResponse<Void> assignUserRoles(@PathVariable Long id, @Valid @RequestBody AssignRolesCommand command) {
        userAdminService.assignUserRoles(id, command);
        return ok(null);
    }

    @PostMapping("/roles/batch")
    public ApiResponse<BatchAssignRolesResult> batchAssignUserRoles(@Valid @RequestBody BatchAssignRolesCommand command) {
        return ok(userAdminService.batchAssignUserRoles(command));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
