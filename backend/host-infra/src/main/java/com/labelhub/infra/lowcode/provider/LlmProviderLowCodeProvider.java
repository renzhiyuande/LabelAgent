package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.LlmProviderSummary;
import com.labelhub.core.business.LlmProviderService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.query.spec.LlmProviderQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LlmProviderLowCodeProvider extends AbstractLowCodeProvider<LlmProviderSummary> {
    private final LlmProviderService llmProviderService;

    public LlmProviderLowCodeProvider(LlmProviderService llmProviderService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.llmProviderService = llmProviderService;
    }

    @Override
    public String resourceKey() {
        return "llm_providers";
    }

    @Override
    public String label() {
        return "大模型服务商";
    }

    @Override
    public Class<LlmProviderSummary> summaryType() {
        return LlmProviderSummary.class;
    }

    @Override
    public PageResponse<LlmProviderSummary> query(ListQuery query) {
        return llmProviderService.listProviders(querySupport.parse(query, LlmProviderQuerySpec.build()));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "delete", id -> llmProviderService.deleteProvider(id),
                "enable", id -> llmProviderService.toggleStatus(id, "ACTIVE"),
                "disable", id -> llmProviderService.toggleStatus(id, "INACTIVE"));
    }
}
