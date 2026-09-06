package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.LlmProviderSummary;
import com.labelhub.core.business.BusinessDtos.RemoteLlmModelOption;
import com.labelhub.core.business.LlmProviderService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.SystemDtos.LlmDiscoverModelsCommand;
import com.labelhub.core.system.SystemDtos.LlmProviderCommand;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/llm-providers")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LlmProviderController {
    private final LlmProviderService llmProviderService;

    public LlmProviderController(LlmProviderService llmProviderService) {
        this.llmProviderService = llmProviderService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<PageResponse<LlmProviderSummary>> listProviders(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        return ok(llmProviderService.listProviders(new ParsedListQuery(page, pageSize, keyword, List.of(), List.of())));
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<LlmProviderSummary> getProvider(@PathVariable Long id) {
        return ok(llmProviderService.getProviderDetail(id));
    }

    @PostMapping
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<LlmProviderSummary> createProvider(@Valid @RequestBody LlmProviderCommand command) {
        return ok(llmProviderService.createProvider(command.providerName(), command.providerCode(),
                command.baseUrl(), command.apiKey(), command.configJson()));
    }

    @PutMapping("/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<LlmProviderSummary> updateProvider(
            @PathVariable Long id,
            @Valid @RequestBody LlmProviderCommand command) {
        return ok(llmProviderService.updateProvider(id, command.providerName(), command.baseUrl(),
                command.apiKey(), command.configJson()));
    }

    @DeleteMapping("/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<Void> deleteProvider(@PathVariable Long id) {
        llmProviderService.deleteProvider(id);
        return ok(null);
    }

    @GetMapping("/{id}/remote-models")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<List<RemoteLlmModelOption>> discoverRemoteModels(@PathVariable Long id) {
        return ok(llmProviderService.discoverRemoteModels(id));
    }

    @PostMapping("/discover-models")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<List<RemoteLlmModelOption>> discoverRemoteModelsPreview(
            @Valid @RequestBody LlmDiscoverModelsCommand command) {
        return ok(llmProviderService.discoverRemoteModels(command.baseUrl(), command.apiKey(),
                command.providerCode()));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
