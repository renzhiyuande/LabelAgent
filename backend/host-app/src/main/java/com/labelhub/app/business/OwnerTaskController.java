package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.lowcode.query.FilterOperator;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.core.util.TraceContext;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner/tasks")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerTaskController {
    private final TaskService taskService;

    public OwnerTaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ApiResponse<PageResponse<TaskSummary>> listTasks(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        return ok(taskService.listTasks(page, pageSize, keyword));
    }

    @GetMapping("/{id}")
    public ApiResponse<TaskDetail> getTask(@PathVariable Long id) {
        return ok(taskService.getTaskDetail(id));
    }

    @PostMapping
    public ApiResponse<TaskSummary> createTask(@Valid @RequestBody TaskCreateCommand command) {
        return ok(taskService.createTask(command));
    }

    @PutMapping("/{id}")
    public ApiResponse<TaskSummary> updateTask(@PathVariable Long id, @Valid @RequestBody TaskUpdateCommand command) {
        return ok(taskService.updateTask(id, command));
    }

    @PostMapping("/{id}/publish")
    public ApiResponse<Void> publishTask(@PathVariable Long id) {
        taskService.publishTask(id);
        return ok(null);
    }

    @PostMapping("/{id}/pause")
    public ApiResponse<Void> pauseTask(@PathVariable Long id) {
        taskService.pauseTask(id);
        return ok(null);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ok(null);
    }

    @PostMapping("/{id}/items")
    public ApiResponse<TaskItemImportBatchSummary> importTaskItems(
            @PathVariable Long id, @Valid @RequestBody TaskItemImportCommand command) {
        return ok(taskService.importTaskItems(id, command));
    }

    @GetMapping("/{id}/items")
    public ApiResponse<List<TaskItemSummary>> listTaskItems(
            @PathVariable Long id,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "100") int pageSize) {
        return ok(taskService.listTaskItems(id, page, pageSize));
    }

    @GetMapping("/{taskId}/assignment-board")
    public ApiResponse<PageResponse<TaskAssignmentBoardRow>> listAssignmentBoard(
            @PathVariable Long taskId,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String assignStatus) {
        List<ParsedFilter> filters = new ArrayList<>();
        if (assignStatus != null && !assignStatus.isBlank()) {
            filters.add(new ParsedFilter("assignStatus", FilterOperator.EQ, assignStatus));
        }
        ParsedListQuery query = new ParsedListQuery(page, pageSize, keyword, filters, List.of());
        return ok(taskService.listAssignmentBoard(taskId, query));
    }

    @GetMapping("/{id}/items/{itemId}")
    public ApiResponse<TaskItemDetail> getTaskItem(@PathVariable Long id, @PathVariable Long itemId) {
        return ok(taskService.getTaskItem(id, itemId));
    }

    @PostMapping("/{id}/template")
    public ApiResponse<TemplateVersionSummary> saveTemplate(
            @PathVariable Long id, @Valid @RequestBody TemplateSaveCommand command) {
        return ok(taskService.saveTemplate(id, command));
    }

    @GetMapping("/{id}/template/latest")
    public ApiResponse<TemplateVersionDetail> getLatestTemplateVersion(@PathVariable Long id) {
        return ok(taskService.getLatestTemplateVersion(id));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
