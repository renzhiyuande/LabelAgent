package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.TaskMemberSummary;
import com.labelhub.core.business.TaskMemberService;
import com.labelhub.core.lowcode.query.FilterOperator;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner/task-members")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerTaskMemberController {
    private final TaskMemberService taskMemberService;

    public OwnerTaskMemberController(TaskMemberService taskMemberService) {
        this.taskMemberService = taskMemberService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public ApiResponse<PageResponse<TaskMemberSummary>> listMembers(
            @RequestParam(required = false) Long taskId,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        List<ParsedFilter> filters = taskId == null ? List.of()
                : List.of(new ParsedFilter("taskId", FilterOperator.EQ, taskId));
        return ok(taskMemberService.listTaskMembers(
                new ParsedListQuery(page, pageSize, null, filters, List.of())));
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public ApiResponse<TaskMemberSummary> getMember(@PathVariable Long id) {
        return ok(taskMemberService.getTaskMember(id));
    }

    @PostMapping
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    public ApiResponse<TaskMemberSummary> addMember(
            @RequestParam Long taskId,
            @RequestParam Long userId,
            @RequestParam(defaultValue = "VIEWER") String memberRole) {
        return ok(taskMemberService.addTaskMember(taskId, userId, memberRole));
    }

    @DeleteMapping("/{id}")
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    public ApiResponse<Void> removeMember(@PathVariable Long id) {
        taskMemberService.removeTaskMember(id);
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
