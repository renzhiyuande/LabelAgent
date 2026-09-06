package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;

public final class TemplateVersionQuerySpec {
    private TemplateVersionQuerySpec() {
    }

    public static ResourceQuerySpec<TemplateVersionEntity> build() {
        return ResourceQuerySpec.<TemplateVersionEntity>builder()
                .longFilter("id", TemplateVersionEntity::getId)
                .longFilter("templateId", TemplateVersionEntity::getTemplateId)
                .longFilter("taskId", TemplateVersionEntity::getTaskId)
                .stringFilter("status", TemplateVersionEntity::getStatus)
                .integerFilter("versionNo", TemplateVersionEntity::getVersionNo)
                .instantFilter("publishedAt", TemplateVersionEntity::getPublishedAt)
                .instantFilter("archivedAt", TemplateVersionEntity::getArchivedAt)
                .instantFilter("createdAt", TemplateVersionEntity::getCreatedAt)
                .instantFilter("updatedAt", TemplateVersionEntity::getUpdatedAt)
                .sortField("versionNo", TemplateVersionEntity::getVersionNo)
                .sortField("status", TemplateVersionEntity::getStatus)
                .sortField("publishedAt", TemplateVersionEntity::getPublishedAt)
                .sortField("createdAt", TemplateVersionEntity::getCreatedAt)
                .build();
    }
}
