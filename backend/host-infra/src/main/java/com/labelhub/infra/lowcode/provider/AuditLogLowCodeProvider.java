package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.SystemDtos.AuditLogSummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.OperationsAdminService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AuditLogLowCodeProvider extends AbstractLowCodeProvider<AuditLogSummary> {
    private final OperationsAdminService operationsAdminService;

    public AuditLogLowCodeProvider(OperationsAdminService operationsAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.operationsAdminService = operationsAdminService;
    }

    @Override
    public String resourceKey() {
        return "auditLogs";
    }

    @Override
    public String label() {
        return "审计日志";
    }

    @Override
    public Class<AuditLogSummary> summaryType() {
        return AuditLogSummary.class;
    }

    @Override
    public PageResponse<AuditLogSummary> query(ListQuery query) {
        return operationsAdminService.listAuditLogs(querySupport.parse(query));
    }
}
