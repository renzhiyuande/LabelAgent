package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TemplateMarketSummary;
import com.labelhub.core.business.TemplateMarketService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TemplateMarketLowCodeProvider extends AbstractLowCodeProvider<TemplateMarketSummary> {
    private final TemplateMarketService templateMarketService;

    public TemplateMarketLowCodeProvider(TemplateMarketService templateMarketService,
            LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.templateMarketService = templateMarketService;
    }

    @Override
    public String resourceKey() {
        return "templateMarketAdmin";
    }

    @Override
    public String label() {
        return "模板市场管理";
    }

    @Override
    public Class<TemplateMarketSummary> summaryType() {
        return TemplateMarketSummary.class;
    }

    @Override
    public PageResponse<TemplateMarketSummary> query(ListQuery query) {
        return templateMarketService.listMarketTemplatesForAdmin(querySupport.parse(query, null));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "approve", id -> templateMarketService.approve(id, ""),
                "reject", id -> templateMarketService.reject(id, ""),
                "publish", id -> templateMarketService.publish(id),
                "offline", id -> templateMarketService.offline(id, "管理员下线"));
    }
}
