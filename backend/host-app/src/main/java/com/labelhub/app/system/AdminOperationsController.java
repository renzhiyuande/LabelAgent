package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.system.SystemDtos.AsyncTaskDetail;
import com.labelhub.core.system.SystemDtos.AsyncTaskSummary;
import com.labelhub.core.system.SystemDtos.AuditLogSummary;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.system.admin.OperationsAdminService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminOperationsController {
    private final OperationsAdminService operationsAdminService;

    public AdminOperationsController(OperationsAdminService operationsAdminService) {
        this.operationsAdminService = operationsAdminService;
    }

    @GetMapping("/audit-logs")
    public ApiResponse<PageResponse<AuditLogSummary>> auditLogs(@RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                                @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
                                                                @RequestParam(required = false) String entityType,
                                                                @RequestParam(required = false) String actionCode,
                                                                @RequestParam(required = false) Long operatorId,
                                                                @RequestParam(required = false) String traceId) {
        return ok(operationsAdminService.listAuditLogs(new PageQuery(page, pageSize, null), entityType, actionCode, operatorId, traceId));
    }

    @GetMapping("/audit-logs/{id}")
    public ApiResponse<AuditLogSummary> auditLog(@PathVariable Long id) {
        return ok(operationsAdminService.getAuditLog(id));
    }

    @GetMapping("/async-tasks")
    public ApiResponse<PageResponse<AsyncTaskSummary>> asyncTasks(@RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                                  @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
                                                                  @RequestParam(required = false) String status) {
        return ok(operationsAdminService.listAsyncTasks(new PageQuery(page, pageSize, null), status));
    }

    @GetMapping("/async-tasks/{id}")
    public ApiResponse<AsyncTaskDetail> asyncTask(@PathVariable Long id) {
        return ok(operationsAdminService.getAsyncTask(id));
    }

    @PostMapping("/async-tasks/{id}/retry")
    public ApiResponse<AsyncTaskSummary> retryAsyncTask(@PathVariable Long id) {
        return ok(operationsAdminService.retryAsyncTask(id));
    }

    @PostMapping("/async-tasks/{id}/cancel")
    public ApiResponse<AsyncTaskSummary> cancelAsyncTask(@PathVariable Long id) {
        return ok(operationsAdminService.cancelAsyncTask(id));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
