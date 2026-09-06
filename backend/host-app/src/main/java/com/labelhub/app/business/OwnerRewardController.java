package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.RewardBatchSummary;
import com.labelhub.core.business.BusinessDtos.RewardDetailRow;
import com.labelhub.core.business.RewardSettlementService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner/reward-settlements")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerRewardController {
    private final RewardSettlementService rewardSettlementService;

    public OwnerRewardController(RewardSettlementService rewardSettlementService) {
        this.rewardSettlementService = rewardSettlementService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public ApiResponse<PageResponse<RewardBatchSummary>> listBatches(
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        return ok(rewardSettlementService.listBatches(taskId,
                new ParsedListQuery(page, pageSize, keyword,
                        buildFilters(status), List.of())));
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public ApiResponse<RewardBatchSummary> getBatch(@PathVariable Long id) {
        return ok(rewardSettlementService.getBatch(id));
    }

    @GetMapping("/{id}/details")
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public ApiResponse<PageResponse<RewardDetailRow>> listDetails(
            @PathVariable Long id,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "50") int pageSize) {
        return ok(rewardSettlementService.listDetails(id,
                new ParsedListQuery(page, pageSize, null, List.of(), List.of())));
    }

    @GetMapping("/{id}/details/{detailId}")
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public ApiResponse<RewardDetailRow> getDetail(
            @PathVariable Long id,
            @PathVariable Long detailId) {
        return ok(rewardSettlementService.getDetail(id, detailId));
    }

    @PostMapping("/tasks/{taskId}")
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public ApiResponse<RewardBatchSummary> createBatch(@PathVariable Long taskId) {
        return ok(rewardSettlementService.createBatch(taskId));
    }

    @PostMapping("/{id}/confirm")
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public ApiResponse<RewardBatchSummary> confirmBatch(@PathVariable Long id) {
        return ok(rewardSettlementService.confirmBatch(id));
    }

    @PostMapping("/{id}/paid")
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public ApiResponse<RewardBatchSummary> markPaid(@PathVariable Long id) {
        return ok(rewardSettlementService.markPaid(id));
    }

    @PostMapping("/{id}/reverse")
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public ApiResponse<RewardBatchSummary> reverseBatch(@PathVariable Long id) {
        return ok(rewardSettlementService.reverseBatch(id));
    }

    @PostMapping("/{id}/export")
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public ApiResponse<RewardBatchSummary> exportBatch(@PathVariable Long id) {
        return ok(rewardSettlementService.exportBatch(id));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }

    private List<com.labelhub.core.lowcode.query.ParsedFilter> buildFilters(String status) {
        if (status == null || status.isBlank()) {
            return List.of();
        }
        return List.of(new com.labelhub.core.lowcode.query.ParsedFilter(
                "status", com.labelhub.core.lowcode.query.FilterOperator.EQ, status));
    }
}
