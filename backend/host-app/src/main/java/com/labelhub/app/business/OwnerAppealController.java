package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealBatchCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealBatchOperationSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealDecisionCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealDetail;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealSummary;
import com.labelhub.core.business.OwnerAppealService;
import com.labelhub.core.lowcode.query.FilterOperator;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/owner/appeals")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerAppealController {
    private final OwnerAppealService ownerAppealService;

    public OwnerAppealController(OwnerAppealService ownerAppealService) {
        this.ownerAppealService = ownerAppealService;
    }

    @GetMapping
    public ApiResponse<PageResponse<SubmissionAppealSummary>> listAppeals(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) String status) {
        List<ParsedFilter> filters = new ArrayList<>();
        if (taskId != null) {
            filters.add(new ParsedFilter("taskId", FilterOperator.EQ, taskId));
        }
        if (status != null && !status.isBlank()) {
            filters.add(new ParsedFilter("status", FilterOperator.EQ, status));
        }
        return ok(ownerAppealService.listAppeals(new ParsedListQuery(page, pageSize, keyword, filters, List.of())));
    }

    @GetMapping("/{appealId}")
    public ApiResponse<SubmissionAppealDetail> getAppeal(@PathVariable Long appealId) {
        return ok(ownerAppealService.getAppeal(appealId));
    }

    @PostMapping("/{appealId}/decision")
    public ApiResponse<SubmissionAppealSummary> decideAppeal(
            @PathVariable Long appealId,
            @Valid @RequestBody SubmissionAppealDecisionCommand command) {
        return ok(ownerAppealService.decideAppeal(appealId, command));
    }

    @PostMapping("/decision/batch")
    public ApiResponse<SubmissionAppealBatchOperationSummary> batchDecideAppeals(
            @Valid @RequestBody OwnerAppealBatchDecisionRequest request) {
        return ok(ownerAppealService.batchDecideAppeals(
                new SubmissionAppealBatchCommand(request.ids(), null),
                new SubmissionAppealDecisionCommand(request.decision(), request.decisionReasonText())));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }

    public record OwnerAppealBatchDecisionRequest(
            @jakarta.validation.constraints.NotEmpty List<Long> ids,
            @jakarta.validation.constraints.Pattern(regexp = "^(APPROVE|REJECT)$") String decision,
            @jakarta.validation.constraints.Size(max = 1000) String decisionReasonText) {
    }
}
