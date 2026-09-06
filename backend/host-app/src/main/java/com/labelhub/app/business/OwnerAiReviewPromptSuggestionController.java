package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.review.AiReviewPromptSuggestion;
import com.labelhub.core.review.AiReviewPromptSuggestionService;
import com.labelhub.core.util.TraceContext;
import jakarta.validation.constraints.Size;
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
@RequestMapping("/api/v1/owner/ai-review-prompt-suggestions")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerAiReviewPromptSuggestionController {

    private final AiReviewPromptSuggestionService suggestionService;

    public OwnerAiReviewPromptSuggestionController(AiReviewPromptSuggestionService suggestionService) {
        this.suggestionService = suggestionService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<List<AiReviewPromptSuggestion>> listSuggestions(
            @RequestParam(required = false) Long templateId) {
        return ApiResponse.success(suggestionService.list(templateId), TraceContext.currentTraceId());
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<AiReviewPromptSuggestion> getSuggestion(@PathVariable Long id) {
        return ApiResponse.success(suggestionService.getDetail(id), TraceContext.currentTraceId());
    }

    @PostMapping("/{id}/accept")
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<AiReviewPromptSuggestion> acceptSuggestion(@PathVariable Long id) {
        return ApiResponse.success(suggestionService.accept(id), TraceContext.currentTraceId());
    }

    @PostMapping("/{id}/dismiss")
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<AiReviewPromptSuggestion> dismissSuggestion(
            @PathVariable Long id, @RequestBody(required = false) DismissSuggestionRequest body) {
        String reason = body == null ? null : body.dismissReason();
        return ApiResponse.success(suggestionService.dismiss(id, reason), TraceContext.currentTraceId());
    }

    public record DismissSuggestionRequest(@Size(max = 500) String dismissReason) {
    }
}
