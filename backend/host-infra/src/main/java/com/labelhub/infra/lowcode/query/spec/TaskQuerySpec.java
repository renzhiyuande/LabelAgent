package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.TaskEntity;

public final class TaskQuerySpec {
    private TaskQuerySpec() {
    }

    public static ResourceQuerySpec<TaskEntity> build() {
        return ResourceQuerySpec.<TaskEntity>builder()
                .stringFilter("status", TaskEntity::getStatus)
                .stringFilter("sceneCode", TaskEntity::getSceneCode)
                .stringFilter("taskCode", TaskEntity::getTaskCode)
                .stringFilter("distributeStrategy", TaskEntity::getDistributeStrategy)
                .longFilter("id", TaskEntity::getId)
                .longFilter("ownerId", TaskEntity::getOwnerId)
                .instantFilter("deadlineAt", TaskEntity::getDeadlineAt)
                .instantFilter("publishedAt", TaskEntity::getPublishedAt)
                .instantFilter("createdAt", TaskEntity::getCreatedAt)
                .instantFilter("updatedAt", TaskEntity::getUpdatedAt)
                .sortField("taskCode", TaskEntity::getTaskCode)
                .sortField("title", TaskEntity::getTitle)
                .sortField("status", TaskEntity::getStatus)
                .sortField("sceneCode", TaskEntity::getSceneCode)
                .sortField("deadlineAt", TaskEntity::getDeadlineAt)
                .sortField("publishedAt", TaskEntity::getPublishedAt)
                .sortField("createdAt", TaskEntity::getCreatedAt)
                .sortField("updatedAt", TaskEntity::getUpdatedAt)
                .build();
    }
}
