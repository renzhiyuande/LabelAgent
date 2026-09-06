package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.TemplateReviewDimensionPackEntity;

public final class DimensionPackQuerySpec {
    private DimensionPackQuerySpec() {
    }

    public static ResourceQuerySpec<TemplateReviewDimensionPackEntity> build() {
        return ResourceQuerySpec.<TemplateReviewDimensionPackEntity>builder()
                .stringFilter("packCode", TemplateReviewDimensionPackEntity::getPackCode)
                .stringFilter("packName", TemplateReviewDimensionPackEntity::getPackName)
                .stringFilter("sceneCode", TemplateReviewDimensionPackEntity::getSceneCode)
                .stringFilter("status", TemplateReviewDimensionPackEntity::getStatus)
                .instantFilter("createdAt", TemplateReviewDimensionPackEntity::getCreatedAt)
                .sortField("packCode", TemplateReviewDimensionPackEntity::getPackCode)
                .sortField("packName", TemplateReviewDimensionPackEntity::getPackName)
                .sortField("sortNo", TemplateReviewDimensionPackEntity::getSortNo)
                .sortField("createdAt", TemplateReviewDimensionPackEntity::getCreatedAt)
                .build();
    }
}
