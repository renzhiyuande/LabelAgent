package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.LlmModelEntity;

public final class LlmModelQuerySpec {
    private LlmModelQuerySpec() {
    }

    public static ResourceQuerySpec<LlmModelEntity> build() {
        return ResourceQuerySpec.<LlmModelEntity>builder()
                .longFilter("providerId", LlmModelEntity::getProviderId)
                .stringFilter("modelCode", LlmModelEntity::getModelCode)
                .stringFilter("modelName", LlmModelEntity::getModelName)
                .stringFilter("modelType", LlmModelEntity::getModelType)
                .stringFilter("status", LlmModelEntity::getStatus)
                .integerFilter("contextWindow", LlmModelEntity::getContextWindow)
                .instantFilter("createdAt", LlmModelEntity::getCreatedAt)
                .sortField("modelCode", LlmModelEntity::getModelCode)
                .sortField("modelName", LlmModelEntity::getModelName)
                .sortField("modelType", LlmModelEntity::getModelType)
                .sortField("createdAt", LlmModelEntity::getCreatedAt)
                .build();
    }
}
