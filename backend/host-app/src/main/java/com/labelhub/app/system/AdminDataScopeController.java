package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.system.SystemDtos.DataScopePolicyCommand;
import com.labelhub.core.system.SystemDtos.DataScopePolicySummary;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.datapermission.DataScopeCatalog;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.system.admin.DataScopeAdminService;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
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
@RequestMapping("/api/v1/admin/data-scopes")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminDataScopeController {
    private final DataScopeAdminService dataScopeAdminService;

    public AdminDataScopeController(DataScopeAdminService dataScopeAdminService) {
        this.dataScopeAdminService = dataScopeAdminService;
    }

    @GetMapping("/meta")
    public ApiResponse<Map<String, Object>> meta() {
        Map<String, Object> scopeTypesByResource = new LinkedHashMap<>();
        DataScopeCatalog.resourceTypes().forEach(resourceType -> scopeTypesByResource.put(
                resourceType.value(),
                DataScopeCatalog.scopeTypesFor(resourceType.value())));
        return ok(Map.of(
                "resourceTypes", DataScopeCatalog.resourceTypes(),
                "scopeTypesByResource", scopeTypesByResource));
    }

    @GetMapping
    public ApiResponse<PageResponse<DataScopePolicySummary>> policies(@RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                                      @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_ADMIN_PAGE_SIZE) int pageSize,
                                                                      @RequestParam(required = false) String keyword) {
        return ok(dataScopeAdminService.listPolicies(new PageQuery(page, pageSize, keyword)));
    }

    @GetMapping("/{id}")
    public ApiResponse<DataScopePolicySummary> policy(@PathVariable Long id) {
        return ok(dataScopeAdminService.getPolicy(id));
    }

    @PostMapping
    public ApiResponse<DataScopePolicySummary> createPolicy(@Valid @RequestBody DataScopePolicyCommand command) {
        return ok(dataScopeAdminService.createPolicy(command));
    }

    @PutMapping("/{id}")
    public ApiResponse<DataScopePolicySummary> updatePolicy(@PathVariable Long id,
                                                            @Valid @RequestBody DataScopePolicyCommand command) {
        return ok(dataScopeAdminService.updatePolicy(id, command));
    }

    @PostMapping("/{id}/enable")
    public ApiResponse<Void> enablePolicy(@PathVariable Long id) {
        dataScopeAdminService.setPolicyStatus(id, "ACTIVE");
        return ok(null);
    }

    @PostMapping("/{id}/disable")
    public ApiResponse<Void> disablePolicy(@PathVariable Long id) {
        dataScopeAdminService.setPolicyStatus(id, "DISABLED");
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
