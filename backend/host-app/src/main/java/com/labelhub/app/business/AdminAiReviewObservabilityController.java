package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityOverview;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityRecordDetail;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityRecordPage;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilitySummary;
import com.labelhub.core.review.AiReviewObservabilityQueryService;
import com.labelhub.core.util.TraceContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/ai-review-observability")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminAiReviewObservabilityController {
    private final AiReviewObservabilityQueryService observabilityQueryService;

    public AdminAiReviewObservabilityController(AiReviewObservabilityQueryService observabilityQueryService) {
        this.observabilityQueryService = observabilityQueryService;
    }

    @GetMapping("/overview")
    @RequireAnyPermission({ "system:admin", "business:ai-review:observe:admin" })
    public ApiResponse<AiReviewObservabilityOverview> overview(
            @RequestParam(defaultValue = "24") int trendHours) {
        return ok(observabilityQueryService.adminOverview(trendHours));
    }

    @GetMapping("/summary")
    @RequireAnyPermission({ "system:admin", "business:ai-review:observe:admin" })
    public ApiResponse<AiReviewObservabilitySummary> summary() {
        return ok(observabilityQueryService.adminSummary());
    }

    @GetMapping("/records")
    @RequireAnyPermission({ "system:admin", "business:ai-review:observe:admin" })
    public ApiResponse<AiReviewObservabilityRecordPage> records(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String modelId,
            @RequestParam(required = false) String verdict) {
        return ok(observabilityQueryService.adminRecords(page, size, taskId, status, modelId, verdict));
    }

    @GetMapping("/records/{aiReviewId}")
    @RequireAnyPermission({ "system:admin", "business:ai-review:observe:admin" })
    public ApiResponse<AiReviewObservabilityRecordDetail> recordDetail(@PathVariable Long aiReviewId) {
        return ok(observabilityQueryService.adminRecordDetail(aiReviewId));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
