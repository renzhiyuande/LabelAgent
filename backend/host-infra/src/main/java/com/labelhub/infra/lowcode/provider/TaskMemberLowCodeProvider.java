package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TaskMemberSummary;
import com.labelhub.core.business.TaskMemberService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.LowCodeResourceAction;
import com.labelhub.infra.lowcode.query.spec.TaskMemberQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TaskMemberLowCodeProvider extends AbstractLowCodeProvider<TaskMemberSummary> {
    private final TaskMemberService taskMemberService;

    public TaskMemberLowCodeProvider(LowCodeQuerySupport querySupport, TaskMemberService taskMemberService) {
        super(querySupport);
        this.taskMemberService = taskMemberService;
    }

    @Override
    public String resourceKey() {
        return "taskMembers";
    }

    @Override
    public String label() {
        return "任务成员";
    }

    @Override
    public Class<TaskMemberSummary> summaryType() {
        return TaskMemberSummary.class;
    }

    @Override
    public PageResponse<TaskMemberSummary> query(ListQuery query) {
        return taskMemberService.listTaskMembers(querySupport.parse(query, TaskMemberQuerySpec.build()));
    }

    @Override
    public Map<String, LowCodeResourceAction> actions() {
        return Map.of();
    }
}
