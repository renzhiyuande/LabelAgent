package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.LlmModelSummary;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.SystemDtos.LlmModelCommand;

public interface LlmModelService {
    PageResponse<LlmModelSummary> listModels(Long providerId, ParsedListQuery query);

    LlmModelSummary getModelDetail(Long id);

    LlmModelSummary createModel(LlmModelCommand command);

    LlmModelSummary updateModel(Long id, LlmModelCommand command);

    void deleteModel(Long id);

    void toggleStatus(Long id, String status);
}
