package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.QuotaReleaseBatchSummary;
import com.labelhub.core.business.BusinessDtos.QuotaReleaseCommand;
import com.labelhub.core.business.QuotaReleaseService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner/tasks/{taskId}/quota-releases")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerQuotaReleaseController {
    private final QuotaReleaseService quotaReleaseService;

    public OwnerQuotaReleaseController(QuotaReleaseService quotaReleaseService) {
        this.quotaReleaseService = quotaReleaseService;
    }

    @PostMapping
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    public ApiResponse<QuotaReleaseBatchSummary> release(
            @PathVariable Long taskId,
            @Valid @RequestBody QuotaReleaseCommand command) {
        return ok(quotaReleaseService.releaseQuota(taskId, command));
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public ApiResponse<PageResponse<QuotaReleaseBatchSummary>> listBatches(
            @PathVariable Long taskId,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        return ok(quotaReleaseService.listReleaseBatches(taskId,
                new ParsedListQuery(page, pageSize, null, List.of(), List.of())));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
