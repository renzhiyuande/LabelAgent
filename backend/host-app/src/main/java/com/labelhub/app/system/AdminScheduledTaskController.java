package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.SystemDtos.ScheduledTaskCreateCommand;
import com.labelhub.core.system.SystemDtos.ScheduledTaskDetail;
import com.labelhub.core.system.SystemDtos.ScheduledTaskSummary;
import com.labelhub.core.system.SystemDtos.ScheduledTaskUpdateCommand;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.async.ScheduledTaskService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/scheduled-tasks")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminScheduledTaskController {
    private final ScheduledTaskService scheduledTaskService;

    public AdminScheduledTaskController(ScheduledTaskService scheduledTaskService) {
        this.scheduledTaskService = scheduledTaskService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<PageResponse<ScheduledTaskSummary>> listTasks(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        return ok(scheduledTaskService.listScheduledTasks(
                new ParsedListQuery(page, pageSize, keyword, List.of(), List.of())));
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<ScheduledTaskDetail> getTask(@PathVariable Long id) {
        return ok(scheduledTaskService.getScheduledTask(id));
    }

    @PostMapping
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<ScheduledTaskSummary> createTask(@Valid @RequestBody ScheduledTaskCreateCommand command) {
        return ok(scheduledTaskService.createScheduledTask(command));
    }

    @PutMapping("/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<ScheduledTaskSummary> updateTask(@PathVariable Long id,
            @Valid @RequestBody ScheduledTaskUpdateCommand command) {
        return ok(scheduledTaskService.updateScheduledTask(id, command));
    }

    @PostMapping("/{id}/enable")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<ScheduledTaskSummary> enableTask(@PathVariable Long id) {
        return ok(scheduledTaskService.enableScheduledTask(id));
    }

    @PostMapping("/{id}/disable")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<ScheduledTaskSummary> disableTask(@PathVariable Long id) {
        return ok(scheduledTaskService.disableScheduledTask(id));
    }

    @PostMapping("/{id}/trigger-now")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<ScheduledTaskSummary> triggerNow(@PathVariable Long id) {
        return ok(scheduledTaskService.triggerNow(id));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
