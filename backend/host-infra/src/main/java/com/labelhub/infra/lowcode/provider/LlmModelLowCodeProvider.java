package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.LlmModelSummary;
import com.labelhub.core.business.LlmModelService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LlmModelLowCodeProvider extends AbstractLowCodeProvider<LlmModelSummary> {
    private final LlmModelService llmModelService;

    public LlmModelLowCodeProvider(LlmModelService llmModelService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.llmModelService = llmModelService;
    }

    @Override
    public String resourceKey() {
        return "llm_models";
    }

    @Override
    public String label() {
        return "LLM 模型";
    }

    @Override
    public Class<LlmModelSummary> summaryType() {
        return LlmModelSummary.class;
    }

    @Override
    public PageResponse<LlmModelSummary> query(ListQuery query) {
        Long providerId = querySupport.requireLongFilter(query.filters(), "providerId");
        return llmModelService.listModels(providerId, querySupport.parse(query));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "enable", id -> llmModelService.toggleStatus(id, "ACTIVE"),
                "disable", id -> llmModelService.toggleStatus(id, "INACTIVE"),
                "delete", llmModelService::deleteModel);
    }
}
