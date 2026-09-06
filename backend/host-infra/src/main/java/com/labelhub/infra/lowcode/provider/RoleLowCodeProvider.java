package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.system.SystemDtos.RoleSummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.RolePermissionAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class RoleLowCodeProvider extends AbstractLowCodeProvider<RoleSummary> implements LowCodeOptionProvider {
    private final RolePermissionAdminService rolePermissionAdminService;

    public RoleLowCodeProvider(RolePermissionAdminService rolePermissionAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.rolePermissionAdminService = rolePermissionAdminService;
    }

    @Override
    public String resourceKey() {
        return "roles";
    }

    @Override
    public String label() {
        return "角色";
    }

    @Override
    public Class<RoleSummary> summaryType() {
        return RoleSummary.class;
    }

    @Override
    public PageResponse<RoleSummary> query(ListQuery query) {
        return rolePermissionAdminService.listRoles(querySupport.parse(query));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "enable", id -> rolePermissionAdminService.setRoleStatus(id, "ACTIVE"),
                "disable", id -> rolePermissionAdminService.setRoleStatus(id, "DISABLED")
        );
    }

    @Override
    public String optionKey() {
        return "roles";
    }

    @Override
    public String optionLabel() {
        return "角色";
    }

    @Override
    public String requiredPermission() {
        return "system:admin";
    }

    @Override
    public List<OptionItem> options(String keyword) {
        return rolePermissionAdminService.listRoles(new PageQuery(1, 100, keyword)).list().stream()
                .map(item -> new OptionItem(item.roleName(), item.id()))
                .toList();
    }
}
