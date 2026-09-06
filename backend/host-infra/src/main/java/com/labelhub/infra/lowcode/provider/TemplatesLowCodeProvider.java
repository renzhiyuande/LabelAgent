package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TemplateSummary;
import com.labelhub.core.business.TemplatesService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.query.spec.TemplateQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TemplatesLowCodeProvider extends AbstractLowCodeProvider<TemplateSummary> {
    private final TemplatesService templatesService;

    public TemplatesLowCodeProvider(TemplatesService templatesService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.templatesService = templatesService;
    }

    @Override
    public String resourceKey() {
        return "templates";
    }

    @Override
    public String label() {
        return "模板主表";
    }

    @Override
    public Class<TemplateSummary> summaryType() {
        return TemplateSummary.class;
    }

    @Override
    public PageResponse<TemplateSummary> query(ListQuery query) {
        ParsedListQuery parsed = querySupport.parse(query, TemplateQuerySpec.build());
        return templatesService.listTemplates(parsed);
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "delete", id -> templatesService.deleteTemplate(id));
    }
}
