package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.SystemDtos.SystemClientSummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.SystemClientAdminService;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SystemClientLowCodeProvider extends AbstractLowCodeProvider<SystemClientSummary> {
    private final SystemClientAdminService systemClientAdminService;

    public SystemClientLowCodeProvider(SystemClientAdminService systemClientAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.systemClientAdminService = systemClientAdminService;
    }

    @Override
    public String resourceKey() {
        return "systemClients";
    }

    @Override
    public String label() {
        return "系统客户端";
    }

    @Override
    public Class<SystemClientSummary> summaryType() {
        return SystemClientSummary.class;
    }

    @Override
    public PageResponse<SystemClientSummary> query(ListQuery query) {
        return systemClientAdminService.listSystemClients(querySupport.toPageQuery(query));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "enable", id -> systemClientAdminService.setSystemClientStatus(id, "ACTIVE"),
                "disable", id -> systemClientAdminService.setSystemClientStatus(id, "DISABLED")
        );
    }
}
