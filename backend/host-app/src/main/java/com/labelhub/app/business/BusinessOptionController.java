package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.lowcode.BusinessOptionProviderRegistry;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/business/options")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class BusinessOptionController {
    private final BusinessOptionProviderRegistry registry;

    public BusinessOptionController(BusinessOptionProviderRegistry registry) {
        this.registry = registry;
    }

    @GetMapping("/{optionKey}")
    public ApiResponse<List<OptionItem>> options(
            @PathVariable String optionKey,
            @RequestParam Map<String, String> params) {
        return ok(registry.option(optionKey).options(OptionRequest.of(params)));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
