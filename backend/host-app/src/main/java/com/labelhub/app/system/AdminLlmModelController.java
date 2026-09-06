package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.LlmModelSummary;
import com.labelhub.core.business.LlmModelService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.SystemDtos.LlmModelCommand;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminLlmModelController {
    private final LlmModelService llmModelService;

    public AdminLlmModelController(LlmModelService llmModelService) {
        this.llmModelService = llmModelService;
    }

    @GetMapping("/llm-providers/{providerId}/models")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<PageResponse<LlmModelSummary>> listModels(
            @PathVariable Long providerId,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        return ok(llmModelService.listModels(providerId,
                new ParsedListQuery(page, pageSize, keyword, List.of(), List.of())));
    }

    @GetMapping("/llm-models/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<LlmModelSummary> getModel(@PathVariable Long id) {
        return ok(llmModelService.getModelDetail(id));
    }

    @PostMapping("/llm-models")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<LlmModelSummary> createModel(@Valid @RequestBody LlmModelCommand command) {
        return ok(llmModelService.createModel(command));
    }

    @PutMapping("/llm-models/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<LlmModelSummary> updateModel(
            @PathVariable Long id,
            @Valid @RequestBody LlmModelCommand command) {
        return ok(llmModelService.updateModel(id, command));
    }

    @DeleteMapping("/llm-models/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<Void> deleteModel(@PathVariable Long id) {
        llmModelService.deleteModel(id);
        return ok(null);
    }

    @PostMapping("/llm-models/{id}/enable")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<Void> enableModel(@PathVariable Long id) {
        llmModelService.toggleStatus(id, "ACTIVE");
        return ok(null);
    }

    @PostMapping("/llm-models/{id}/disable")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<Void> disableModel(@PathVariable Long id) {
        llmModelService.toggleStatus(id, "INACTIVE");
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
