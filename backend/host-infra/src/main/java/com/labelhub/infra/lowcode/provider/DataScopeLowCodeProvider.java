package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.SystemDtos.DataScopePolicySummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.DataScopeAdminService;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DataScopeLowCodeProvider extends AbstractLowCodeProvider<DataScopePolicySummary> {
    private final DataScopeAdminService dataScopeAdminService;

    public DataScopeLowCodeProvider(DataScopeAdminService dataScopeAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.dataScopeAdminService = dataScopeAdminService;
    }

    @Override
    public String resourceKey() {
        return "dataScopes";
    }

    @Override
    public String label() {
        return "数据范围";
    }

    @Override
    public Class<DataScopePolicySummary> summaryType() {
        return DataScopePolicySummary.class;
    }

    @Override
    public PageResponse<DataScopePolicySummary> query(ListQuery query) {
        return dataScopeAdminService.listPolicies(querySupport.toPageQuery(query));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "enable", id -> dataScopeAdminService.setPolicyStatus(id, "ACTIVE"),
                "disable", id -> dataScopeAdminService.setPolicyStatus(id, "DISABLED")
        );
    }
}
