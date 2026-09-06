package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.AssignmentService;
import com.labelhub.core.business.BusinessDtos.TaskAssignmentBoardRow;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeBulkResourceAction;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 分配题目池：列表仍走 Owner REST；批量动作走 Engine bulk（ids 为 task_item.id）。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TaskAssignmentBoardLowCodeProvider extends AbstractLowCodeProvider<TaskAssignmentBoardRow> {
    private final AssignmentService assignmentService;

    public TaskAssignmentBoardLowCodeProvider(
            AssignmentService assignmentService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.assignmentService = assignmentService;
    }

    @Override
    public String resourceKey() {
        return "taskAssignmentBoard";
    }

    @Override
    public String label() {
        return "分配题目池";
    }

    @Override
    public Class<TaskAssignmentBoardRow> summaryType() {
        return TaskAssignmentBoardRow.class;
    }

    @Override
    public PageResponse<TaskAssignmentBoardRow> query(ListQuery query) {
        throw new BusinessException(
                ErrorCode.INVALID_OPERATION, "taskAssignmentBoard list uses owner REST API");
    }

    @Override
    public Map<String, LowCodeBulkResourceAction> bulkActions() {
        return Map.of(
                "batchCancel", ids -> assignmentService.batchCancelAssignmentsByItemIds(ids, ""),
                "batchReopen", assignmentService::batchReopenAssignmentsByItemIds);
    }
}
