package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.review.AiReviewOwnerSummary;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.business.review.service.OwnerAiReviewQueryService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/owner/submissions")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerAiReviewController {

    private final OwnerAiReviewQueryService ownerAiReviewQueryService;

    public OwnerAiReviewController(OwnerAiReviewQueryService ownerAiReviewQueryService) {
        this.ownerAiReviewQueryService = ownerAiReviewQueryService;
    }

    @GetMapping("/{submissionId}/ai-review")
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<AiReviewOwnerSummary> getAiReview(@PathVariable Long submissionId) {
        AiReviewOwnerSummary summary = ownerAiReviewQueryService.queryLatestReviewForOwner(submissionId);
        return ApiResponse.success(summary, TraceContext.currentTraceId());
    }
}
