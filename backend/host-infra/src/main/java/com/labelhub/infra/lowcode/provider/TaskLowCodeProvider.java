package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TaskSummary;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.query.spec.TaskQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TaskLowCodeProvider extends AbstractLowCodeProvider<TaskSummary> {
    private final TaskService taskService;

    public TaskLowCodeProvider(TaskService taskService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.taskService = taskService;
    }

    @Override
    public String resourceKey() {
        return "tasks";
    }

    @Override
    public String label() {
        return "标注任务";
    }

    @Override
    public Class<TaskSummary> summaryType() {
        return TaskSummary.class;
    }

    @Override
    public PageResponse<TaskSummary> query(ListQuery query) {
        return taskService.listTasks(querySupport.parse(query, TaskQuerySpec.build()));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
            "publish", id -> taskService.publishTask(id),
            "delete", id -> taskService.deleteTask(id)
        );
    }
}
