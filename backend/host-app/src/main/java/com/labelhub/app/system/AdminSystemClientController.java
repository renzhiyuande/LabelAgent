package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.system.SystemDtos.RotatedSecret;
import com.labelhub.core.system.SystemDtos.SystemClientCommand;
import com.labelhub.core.system.SystemDtos.SystemClientSummary;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.system.admin.SystemClientAdminService;
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
@RequestMapping("/api/v1/admin/system-clients")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminSystemClientController {
    private final SystemClientAdminService systemClientAdminService;

    public AdminSystemClientController(SystemClientAdminService systemClientAdminService) {
        this.systemClientAdminService = systemClientAdminService;
    }

    @GetMapping
    public ApiResponse<PageResponse<SystemClientSummary>> systemClients(@RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                                        @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_ADMIN_PAGE_SIZE) int pageSize,
                                                                        @RequestParam(required = false) String keyword) {
        return ok(systemClientAdminService.listSystemClients(new PageQuery(page, pageSize, keyword)));
    }

    @GetMapping("/{id}")
    public ApiResponse<SystemClientSummary> systemClient(@PathVariable Long id) {
        return ok(systemClientAdminService.getSystemClient(id));
    }

    @PostMapping
    public ApiResponse<SystemClientSummary> createSystemClient(@Valid @RequestBody SystemClientCommand command) {
        return ok(systemClientAdminService.createSystemClient(command));
    }

    @PutMapping("/{id}")
    public ApiResponse<SystemClientSummary> updateSystemClient(@PathVariable Long id,
                                                               @Valid @RequestBody SystemClientCommand command) {
        return ok(systemClientAdminService.updateSystemClient(id, command));
    }

    @PostMapping("/{id}/enable")
    public ApiResponse<Void> enableSystemClient(@PathVariable Long id) {
        systemClientAdminService.setSystemClientStatus(id, "ACTIVE");
        return ok(null);
    }

    @PostMapping("/{id}/disable")
    public ApiResponse<Void> disableSystemClient(@PathVariable Long id) {
        systemClientAdminService.setSystemClientStatus(id, "DISABLED");
        return ok(null);
    }

    @PostMapping("/{id}/rotate-secret")
    public ApiResponse<RotatedSecret> rotateSecret(@PathVariable Long id) {
        return ok(systemClientAdminService.rotateSystemClientSecret(id));
    }

    @PostMapping("/{id}/probe-health")
    public ApiResponse<SystemClientSummary> probeHealth(@PathVariable Long id) {
        return ok(systemClientAdminService.probeSystemClientHealth(id));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
