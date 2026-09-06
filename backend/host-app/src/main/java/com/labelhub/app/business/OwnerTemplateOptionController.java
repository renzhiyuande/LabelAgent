package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.lowcode.LowCodeDtos.OptionSourceItem;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.lowcode.TemplateOptionCatalog;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/owner/template-options")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerTemplateOptionController {
    private final TemplateOptionCatalog templateOptionCatalog;

    public OwnerTemplateOptionController(TemplateOptionCatalog templateOptionCatalog) {
        this.templateOptionCatalog = templateOptionCatalog;
    }

    /**
     * 模板搭建器 remote 数据源目录：Owner 配置 schema 时使用，与 Labeler 运行时加载能力对齐。
     */
    @GetMapping("/sources")
    @RequireAnyPermission({
            "system:admin",
            "business:template:read",
            "business:template:create",
            "business:template:update",
            "business:task:template_save"
    })
    public ApiResponse<List<OptionSourceItem>> sources() {
        return ok(templateOptionCatalog.listSources());
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
