package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TaskItemSummary;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.query.spec.TaskItemQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TaskItemLowCodeProvider extends AbstractLowCodeProvider<TaskItemSummary> {
    private final TaskService taskService;

    public TaskItemLowCodeProvider(TaskService taskService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.taskService = taskService;
    }

    @Override
    public String resourceKey() {
        return "taskItems";
    }

    @Override
    public String label() {
        return "标注数据项";
    }

    @Override
    public Class<TaskItemSummary> summaryType() {
        return TaskItemSummary.class;
    }

    @Override
    public PageResponse<TaskItemSummary> query(ListQuery query) {
        return taskService.listTaskItems(querySupport.parse(query, TaskItemQuerySpec.build()));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of("delete", taskService::deleteTaskItem);
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeBulkResourceAction> bulkActions() {
        return Map.of("delete", taskService::deleteTaskItems);
    }
}
