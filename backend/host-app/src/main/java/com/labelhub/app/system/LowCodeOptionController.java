package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.LowCodeDtos.OptionSourceItem;
import com.labelhub.core.lowcode.LowCodeDtos.TreeOptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.lowcode.LowCodeProviderRegistry;
import com.labelhub.infra.lowcode.TreeLowCodeOptionProvider;
import com.labelhub.infra.system.admin.DictAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/engine/options")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LowCodeOptionController {
    private final LowCodeProviderRegistry registry;
    private final DictAdminService dictAdminService;

    public LowCodeOptionController(LowCodeProviderRegistry registry, DictAdminService dictAdminService) {
        this.registry = registry;
        this.dictAdminService = dictAdminService;
    }

    @GetMapping
    public ApiResponse<List<OptionSourceItem>> optionSources() {
        return ok(registry.optionSources());
    }

    @GetMapping("/dict/{dictCode}")
    public ApiResponse<List<OptionItem>> dictOptions(@PathVariable String dictCode) {
        return ok(dictAdminService.getActiveDictOptions(dictCode));
    }

    @GetMapping("/{optionKey}")
    public ApiResponse<List<OptionItem>> options(@PathVariable String optionKey,
                                                 @RequestParam Map<String, String> params) {
        return ok(registry.option(optionKey).options(OptionRequest.of(params)));
    }

    @GetMapping("/{optionKey}/tree")
    public ApiResponse<List<TreeOptionItem>> treeOptions(@PathVariable String optionKey,
                                                         @RequestParam Map<String, String> params) {
        var provider = registry.option(optionKey);
        if (!(provider instanceof TreeLowCodeOptionProvider treeProvider)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Tree options not supported: " + optionKey);
        }
        return ok(treeProvider.treeOptions(OptionRequest.of(params)));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
