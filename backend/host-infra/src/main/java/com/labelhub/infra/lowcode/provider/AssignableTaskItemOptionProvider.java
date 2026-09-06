package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TaskAssignmentBoardRow;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import com.labelhub.core.lowcode.query.FilterOperator;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.lowcode.BusinessOptionProvider;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 与任务「分配看板」未指派筛选一致：无有效分配，或存在可复用的 UNCLAIMED+revoked 分配。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AssignableTaskItemOptionProvider implements BusinessOptionProvider {
    private static final int MAX_OPTIONS = 200;

    private final TaskService taskService;

    public AssignableTaskItemOptionProvider(TaskService taskService) {
        this.taskService = taskService;
    }

    @Override
    public String optionKey() {
        return "assignableTaskItems";
    }

    @Override
    public String optionLabel() {
        return "可分配题目";
    }

    @Override
    public String[] requiredPermissions() {
        return new String[] { "system:admin", "business:assignment:create", "business:assignment:read" };
    }

    @Override
    public List<OptionItem> options(OptionRequest request) {
        Long taskId = resolveTaskId(request);
        if (taskId == null) {
            return List.of();
        }
        return options(request.role(), String.valueOf(taskId));
    }

    @Override
    public List<OptionItem> options(String role, String keyword) {
        Long taskId = parseTaskId(keyword);
        if (taskId == null) {
            return List.of();
        }
        ParsedListQuery query = new ParsedListQuery(
                1,
                MAX_OPTIONS,
                null,
                List.of(new ParsedFilter("assignStatus", FilterOperator.EQ, "UNASSIGNED")),
                List.of());
        PageResponse<TaskAssignmentBoardRow> page = taskService.listAssignmentBoard(taskId, query);
        return page.list().stream()
                .filter(TaskAssignmentBoardRow::assignable)
                .map(AssignableTaskItemOptionProvider::toOptionItem)
                .toList();
    }

    private static OptionItem toOptionItem(TaskAssignmentBoardRow row) {
        String label = formatItemLabel(row.sourceItemKey(), row.seqNo(), row.id());
        return new OptionItem(label, row.id());
    }

    private static Long parseTaskId(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        try {
            long value = Long.parseLong(keyword.trim());
            return value > 0 ? value : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static Long resolveTaskId(OptionRequest request) {
        String raw = request.get("taskId");
        if (raw == null || raw.isBlank()) {
            raw = request.keyword();
        }
        return parseTaskId(raw);
    }

    private static String formatItemLabel(String sourceItemKey, Integer seqNo, Long itemId) {
        if (sourceItemKey != null && !sourceItemKey.isBlank() && seqNo != null) {
            return sourceItemKey + " (#" + seqNo + ")";
        }
        if (sourceItemKey != null && !sourceItemKey.isBlank()) {
            return sourceItemKey;
        }
        if (seqNo != null) {
            return "题目 #" + seqNo;
        }
        return String.valueOf(itemId);
    }
}
