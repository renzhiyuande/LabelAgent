package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.LlmCatalogProviderOption;
import com.labelhub.core.business.LlmProviderService;
import com.labelhub.core.util.TraceContext;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/owner/llm-catalog")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerLlmCatalogController {
    private final LlmProviderService llmProviderService;

    public OwnerLlmCatalogController(LlmProviderService llmProviderService) {
        this.llmProviderService = llmProviderService;
    }

    @GetMapping
    @RequireAnyPermission({
            "system:admin",
            "business:task:read",
            "business:template:read",
            "business:template:manage",
            "business:task:template_save"
    })
    public ApiResponse<List<LlmCatalogProviderOption>> listCatalog(
            @RequestParam(defaultValue = "REVIEW") String scenario) {
        return ok(llmProviderService.listCatalog(scenario));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
