package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.LlmProviderEntity;

public final class LlmProviderQuerySpec {
    private LlmProviderQuerySpec() {
    }

    public static ResourceQuerySpec<LlmProviderEntity> build() {
        return ResourceQuerySpec.<LlmProviderEntity>builder()
                .stringFilter("providerCode", LlmProviderEntity::getProviderCode)
                .stringFilter("providerName", LlmProviderEntity::getProviderName)
                .stringFilter("baseUrl", LlmProviderEntity::getBaseUrl)
                .stringFilter("status", LlmProviderEntity::getStatus)
                .integerFilter("isSystemProvider", LlmProviderEntity::getIsSystemProvider)
                .instantFilter("createdAt", LlmProviderEntity::getCreatedAt)
                .sortField("providerCode", LlmProviderEntity::getProviderCode)
                .sortField("providerName", LlmProviderEntity::getProviderName)
                .sortField("baseUrl", LlmProviderEntity::getBaseUrl)
                .sortField("createdAt", LlmProviderEntity::getCreatedAt)
                .build();
    }
}
