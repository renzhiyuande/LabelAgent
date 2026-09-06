package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.business.BusinessDtos.TaskOptionRow;
import com.labelhub.core.business.BusinessDtos.TaskSummary;
import com.labelhub.core.business.ReviewerWorkbenchService;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import java.util.List;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TaskOptionProvider implements LowCodeOptionProvider {
    private static final int MAX_OPTIONS = 100;

    private final TaskService taskService;
    private final ReviewerWorkbenchService reviewerWorkbenchService;
    private final CurrentUserProvider currentUserProvider;

    public TaskOptionProvider(
            TaskService taskService,
            ReviewerWorkbenchService reviewerWorkbenchService,
            CurrentUserProvider currentUserProvider) {
        this.taskService = taskService;
        this.reviewerWorkbenchService = reviewerWorkbenchService;
        this.currentUserProvider = currentUserProvider;
    }

    @Override
    public String optionKey() {
        return "tasks";
    }

    @Override
    public String optionLabel() {
        return "任务";
    }

    @Override
    public String[] requiredPermissions() {
        return new String[] { "business:task:read", "business:reviewer:workbench", "system:admin" };
    }

    @Override
    public List<OptionItem> options(String keyword) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (canUseOwnerTaskList(user)) {
            return listOwnerTaskOptions(keyword);
        }
        return reviewerWorkbenchService.listAccessibleTaskOptions(keyword).stream()
                .map(TaskOptionProvider::toOptionItem)
                .toList();
    }

    private List<OptionItem> listOwnerTaskOptions(String keyword) {
        if (keyword != null && keyword.matches("\\d{8,}")) {
            try {
                var detail = taskService.getTaskDetail(Long.parseLong(keyword));
                return List.of(new OptionItem(formatTaskLabel(detail.title(), detail.taskCode()), detail.id()));
            } catch (BusinessException ignored) {
                // fall through to title search
            }
        }
        PageResponse<TaskSummary> page = taskService.listTasks(1, MAX_OPTIONS, keyword);
        return page.list().stream()
                .map(task -> new OptionItem(formatTaskLabel(task), task.id()))
                .toList();
    }

    private boolean canUseOwnerTaskList(AuthenticatedUser user) {
        if (user == null || user.permissions() == null || user.permissions().isEmpty()) {
            return false;
        }
        Set<String> permissions = user.permissions();
        return permissions.contains("system:admin") || permissions.contains("business:task:read");
    }

    private static OptionItem toOptionItem(TaskOptionRow task) {
        return new OptionItem(formatTaskLabel(task.title(), task.taskCode()), task.id());
    }

    private static String formatTaskLabel(TaskSummary task) {
        return formatTaskLabel(task.title(), task.taskCode());
    }

    private static String formatTaskLabel(String title, String taskCode) {
        if (taskCode != null && !taskCode.isBlank()) {
            return title + " (" + taskCode + ")";
        }
        return title;
    }
}
