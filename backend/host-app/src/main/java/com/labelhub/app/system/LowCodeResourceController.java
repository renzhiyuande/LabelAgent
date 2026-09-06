package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.BatchActionCommand;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.LowCodeDtos.ResourceRegistryItem;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.lowcode.LowCodeActionDispatcher;
import com.labelhub.infra.lowcode.LowCodeProviderRegistry;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/engine/resources")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LowCodeResourceController {
    private final LowCodeProviderRegistry registry;
    private final LowCodeActionDispatcher actionDispatcher;

    public LowCodeResourceController(
            LowCodeProviderRegistry registry,
            LowCodeActionDispatcher actionDispatcher) {
        this.registry = registry;
        this.actionDispatcher = actionDispatcher;
    }

    @GetMapping
    public ApiResponse<List<ResourceRegistryItem>> resources() {
        return ok(registry.resources());
    }

    @PostMapping("/{resource}/query")
    public ApiResponse<PageResponse<?>> query(@PathVariable String resource,
                                              @Valid @RequestBody ListQuery query) {
        return ok(registry.resource(resource).query(query));
    }

    @PostMapping("/{resource}/actions/{action}/batch")
    public ApiResponse<Void> runBatchAction(@PathVariable String resource,
                                            @PathVariable String action,
                                            @Valid @RequestBody BatchActionCommand command) {
        actionDispatcher.runBatch(resource, action, command.ids());
        return ok(null);
    }

    @PostMapping("/{resource}/{id}/actions/{action}")
    public ApiResponse<Void> runAction(@PathVariable String resource,
                                       @PathVariable Long id,
                                       @PathVariable String action) {
        actionDispatcher.run(resource, id, action);
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
