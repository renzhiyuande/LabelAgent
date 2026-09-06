package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TemplateReviewDimensionPackSummary;
import com.labelhub.core.business.DimensionPackService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.query.spec.DimensionPackQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DimensionPackLowCodeProvider extends AbstractLowCodeProvider<TemplateReviewDimensionPackSummary> {
    private final DimensionPackService dimensionPackService;

    public DimensionPackLowCodeProvider(DimensionPackService dimensionPackService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.dimensionPackService = dimensionPackService;
    }

    @Override
    public String resourceKey() {
        return "dimension_packs";
    }

    @Override
    public String label() {
        return "审核维度包";
    }

    @Override
    public Class<TemplateReviewDimensionPackSummary> summaryType() {
        return TemplateReviewDimensionPackSummary.class;
    }

    @Override
    public PageResponse<TemplateReviewDimensionPackSummary> query(ListQuery query) {
        return dimensionPackService.listPacks(querySupport.parse(query, DimensionPackQuerySpec.build()));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "delete", id -> dimensionPackService.deletePack(id),
                "enable", id -> dimensionPackService.updatePackStatus(id, "ACTIVE"),
                "disable", id -> dimensionPackService.updatePackStatus(id, "INACTIVE"));
    }
}
