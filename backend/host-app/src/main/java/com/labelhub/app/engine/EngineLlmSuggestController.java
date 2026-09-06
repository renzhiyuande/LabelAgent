package com.labelhub.app.engine;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.LlmSuggestCommand;
import com.labelhub.core.business.BusinessDtos.LlmSuggestPreviewCommand;
import com.labelhub.core.business.BusinessDtos.LlmSuggestPreviewResult;
import com.labelhub.core.business.BusinessDtos.LlmSuggestResult;
import com.labelhub.core.business.LlmSuggestService;
import com.labelhub.core.util.TraceContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/engine/llm-suggest")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class EngineLlmSuggestController {
    private final LlmSuggestService llmSuggestService;

    public EngineLlmSuggestController(LlmSuggestService llmSuggestService) {
        this.llmSuggestService = llmSuggestService;
    }

    @PostMapping
    @RequireAnyPermission({
            "business:labeler:workbench",
            "business:template:read",
            "business:template:manage",
            "business:task:template_save",
            "system:admin"
    })
    public ApiResponse<LlmSuggestResult> suggest(@RequestBody LlmSuggestCommand command) {
        return ApiResponse.success(llmSuggestService.suggest(command), TraceContext.currentTraceId());
    }

    @PostMapping("/preview")
    @RequireAnyPermission({
            "business:labeler:workbench",
            "business:template:read",
            "business:template:manage",
            "business:task:template_save",
            "system:admin"
    })
    public ApiResponse<LlmSuggestPreviewResult> preview(@RequestBody LlmSuggestPreviewCommand command) {
        return ApiResponse.success(llmSuggestService.preview(command), TraceContext.currentTraceId());
    }
}
