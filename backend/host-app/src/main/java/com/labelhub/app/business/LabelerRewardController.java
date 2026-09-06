package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.RewardDetailRow;
import com.labelhub.core.business.RewardSettlementService;
import com.labelhub.core.lowcode.query.FilterOperator;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/labeler/my-rewards")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LabelerRewardController {
    private final RewardSettlementService rewardSettlementService;

    public LabelerRewardController(RewardSettlementService rewardSettlementService) {
        this.rewardSettlementService = rewardSettlementService;
    }

    @GetMapping
    public ApiResponse<PageResponse<RewardDetailRow>> listMyRewards(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String batchStatus) {
        return ok(rewardSettlementService.listMyRewards(new ParsedListQuery(
                page, pageSize, keyword, buildFilters(taskId, status, batchStatus), List.of())));
    }

    @GetMapping("/{id}")
    public ApiResponse<RewardDetailRow> getMyReward(@PathVariable Long id) {
        return ok(rewardSettlementService.getMyReward(id));
    }

    private List<ParsedFilter> buildFilters(Long taskId, String status, String batchStatus) {
        List<ParsedFilter> filters = new ArrayList<>();
        if (taskId != null) {
            filters.add(new ParsedFilter("taskId", FilterOperator.EQ, taskId));
        }
        if (status != null && !status.isBlank()) {
            filters.add(new ParsedFilter("status", FilterOperator.EQ, status));
        }
        if (batchStatus != null && !batchStatus.isBlank()) {
            filters.add(new ParsedFilter("batchStatus", FilterOperator.EQ, batchStatus));
        }
        return filters;
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
