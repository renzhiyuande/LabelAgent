package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.DimensionPackSaveCommand;
import com.labelhub.core.business.BusinessDtos.TemplateReviewDimensionPackSummary;
import com.labelhub.core.lowcode.query.ParsedListQuery;

public interface DimensionPackService {
    PageResponse<TemplateReviewDimensionPackSummary> listPacks(ParsedListQuery query);

    TemplateReviewDimensionPackSummary getPackDetail(Long id);

    TemplateReviewDimensionPackSummary createPack(DimensionPackSaveCommand command);

    TemplateReviewDimensionPackSummary updatePack(Long id, DimensionPackSaveCommand command);

    void updatePackStatus(Long id, String status);

    void deletePack(Long id);

    void applyPackToTemplateVersion(Long packId, Long templateVersionId);
}
