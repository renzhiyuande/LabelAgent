package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.SystemDtos.AsyncTaskSummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.OperationsAdminService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AsyncTaskLowCodeProvider extends AbstractLowCodeProvider<AsyncTaskSummary> {
    private final OperationsAdminService operationsAdminService;

    public AsyncTaskLowCodeProvider(OperationsAdminService operationsAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.operationsAdminService = operationsAdminService;
    }

    @Override
    public String resourceKey() {
        return "asyncTasks";
    }

    @Override
    public String label() {
        return "异步任务";
    }

    @Override
    public Class<AsyncTaskSummary> summaryType() {
        return AsyncTaskSummary.class;
    }

    @Override
    public PageResponse<AsyncTaskSummary> query(ListQuery query) {
        return operationsAdminService.listAsyncTasks(querySupport.parse(query));
    }
}
