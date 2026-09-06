package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.review.AiReviewHealthCatalogPage;
import com.labelhub.core.review.AiReviewHealthCatalogService;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.core.util.TraceContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/owner/ai-review-health")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerAiReviewHealthCatalogController {

    private final AiReviewHealthCatalogService catalogService;

    public OwnerAiReviewHealthCatalogController(AiReviewHealthCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/catalog")
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public ApiResponse<AiReviewHealthCatalogPage> listCatalog(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long includeTemplateId) {
        return ApiResponse.success(
                catalogService.listCatalog(page, pageSize, keyword, includeTemplateId),
                TraceContext.currentTraceId());
    }
}
