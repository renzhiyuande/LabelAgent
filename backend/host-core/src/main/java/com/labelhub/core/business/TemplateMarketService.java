package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TemplateMarketInstallResult;
import com.labelhub.core.business.BusinessDtos.TemplateMarketSummary;
import com.labelhub.core.lowcode.query.ParsedListQuery;

public interface TemplateMarketService {
    PageResponse<TemplateMarketSummary> listMarketTemplates(ParsedListQuery query);

    PageResponse<TemplateMarketSummary> listMarketTemplatesForAdmin(ParsedListQuery query);

    TemplateMarketSummary getMarketDetail(Long id);

    TemplateMarketSummary getMarketDetailForAdmin(Long id);

    TemplateMarketSummary submitForReview(Long templateVersionId, String description);

    TemplateMarketSummary approve(Long marketId, String reviewComment);

    TemplateMarketSummary reject(Long marketId, String reviewComment);

    TemplateMarketSummary publish(Long marketId);

    TemplateMarketSummary offline(Long marketId, String reason);

    TemplateMarketInstallResult installFromMarket(Long marketId);
}
