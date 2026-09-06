package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.review.AiReviewPromptHealthOverview;
import com.labelhub.core.review.AiReviewPromptHealthQueryService;
import com.labelhub.core.review.AiReviewPromptSuggestionService;
import com.labelhub.core.review.PromptOptimizationTaskStatus;
import com.labelhub.core.util.TraceContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/owner/templates")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerAiReviewHealthController {

    private final AiReviewPromptHealthQueryService promptHealthQueryService;
    private final AiReviewPromptSuggestionService promptSuggestionService;

    public OwnerAiReviewHealthController(
            AiReviewPromptHealthQueryService promptHealthQueryService,
            AiReviewPromptSuggestionService promptSuggestionService) {
        this.promptHealthQueryService = promptHealthQueryService;
        this.promptSuggestionService = promptSuggestionService;
    }

    @GetMapping("/{templateId}/ai-review-health")
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<AiReviewPromptHealthOverview> getAiReviewHealth(
            @PathVariable Long templateId,
            @RequestParam(required = false) Long templateVersionId) {
        AiReviewPromptHealthOverview overview =
                promptHealthQueryService.getHealthOverview(templateId, templateVersionId);
        return ApiResponse.success(overview, TraceContext.currentTraceId());
    }

    @PostMapping("/{templateId}/ai-review-health/refresh")
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<AiReviewPromptHealthOverview> refreshAiReviewHealth(
            @PathVariable Long templateId,
            @RequestParam(required = false) Long templateVersionId) {
        AiReviewPromptHealthOverview overview =
                promptHealthQueryService.refreshHealth(templateId, templateVersionId);
        return ApiResponse.success(overview, TraceContext.currentTraceId());
    }

    @PostMapping("/{templateId}/ai-review-health/trigger-optimization")
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<Void> triggerPromptOptimization(@PathVariable Long templateId) {
        promptSuggestionService.triggerOptimizationForTemplate(templateId);
        return ApiResponse.success(null, TraceContext.currentTraceId());
    }

    @GetMapping("/{templateId}/ai-review-health/optimization-task")
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<PromptOptimizationTaskStatus> getLatestOptimizationTask(@PathVariable Long templateId) {
        PromptOptimizationTaskStatus status = promptSuggestionService.getLatestManualOptimizationTask(templateId);
        return ApiResponse.success(status, TraceContext.currentTraceId());
    }
}
