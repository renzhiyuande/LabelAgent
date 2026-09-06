package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.TemplatesEntity;

public final class TemplateQuerySpec {
    private TemplateQuerySpec() {
    }

    public static ResourceQuerySpec<TemplatesEntity> build() {
        return ResourceQuerySpec.<TemplatesEntity>builder()
                .stringFilter("status", TemplatesEntity::getStatus)
                .stringFilter("sceneCode", TemplatesEntity::getSceneCode)
                .stringFilter("templateCode", TemplatesEntity::getTemplateCode)
                .stringFilter("templateName", TemplatesEntity::getTemplateName)
                .longFilter("id", TemplatesEntity::getId)
                .longFilter("taskId", TemplatesEntity::getTaskId)
                .longFilter("currentTemplateVersionId", TemplatesEntity::getCurrentTemplateVersionId)
                .integerFilter("latestVersionNo", TemplatesEntity::getLatestVersionNo)
                .instantFilter("createdAt", TemplatesEntity::getCreatedAt)
                .instantFilter("updatedAt", TemplatesEntity::getUpdatedAt)
                .sortField("templateCode", TemplatesEntity::getTemplateCode)
                .sortField("templateName", TemplatesEntity::getTemplateName)
                .sortField("status", TemplatesEntity::getStatus)
                .sortField("sceneCode", TemplatesEntity::getSceneCode)
                .sortField("latestVersionNo", TemplatesEntity::getLatestVersionNo)
                .sortField("createdAt", TemplatesEntity::getCreatedAt)
                .sortField("updatedAt", TemplatesEntity::getUpdatedAt)
                .build();
    }
}
