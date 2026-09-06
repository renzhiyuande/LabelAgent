package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.SystemDtos.PermissionSummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.RolePermissionAdminService;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class PermissionLowCodeProvider extends AbstractLowCodeProvider<PermissionSummary> {
    private final RolePermissionAdminService rolePermissionAdminService;

    public PermissionLowCodeProvider(RolePermissionAdminService rolePermissionAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.rolePermissionAdminService = rolePermissionAdminService;
    }

    @Override
    public String resourceKey() {
        return "permissions";
    }

    @Override
    public String label() {
        return "权限";
    }

    @Override
    public Class<PermissionSummary> summaryType() {
        return PermissionSummary.class;
    }

    @Override
    public PageResponse<PermissionSummary> query(ListQuery query) {
        return rolePermissionAdminService.listPermissions(querySupport.toPageQuery(query));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "enable", id -> rolePermissionAdminService.setPermissionStatus(id, "ACTIVE"),
                "disable", id -> rolePermissionAdminService.setPermissionStatus(id, "DISABLED")
        );
    }
}
