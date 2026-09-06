package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.SystemDtos.ScheduledTaskSummary;
import com.labelhub.infra.async.ScheduledTaskService;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ScheduledTaskLowCodeProvider extends AbstractLowCodeProvider<ScheduledTaskSummary> {
    private final ScheduledTaskService scheduledTaskService;

    public ScheduledTaskLowCodeProvider(ScheduledTaskService scheduledTaskService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.scheduledTaskService = scheduledTaskService;
    }

    @Override
    public String resourceKey() {
        return "scheduledTasks";
    }

    @Override
    public String label() {
        return "定时任务";
    }

    @Override
    public Class<ScheduledTaskSummary> summaryType() {
        return ScheduledTaskSummary.class;
    }

    @Override
    public PageResponse<ScheduledTaskSummary> query(ListQuery query) {
        return scheduledTaskService.listScheduledTasks(querySupport.parse(query));
    }
}
