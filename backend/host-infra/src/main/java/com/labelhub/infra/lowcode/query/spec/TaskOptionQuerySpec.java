package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.TaskEntity;

public final class TaskOptionQuerySpec {
    private TaskOptionQuerySpec() {
    }

    public static ResourceQuerySpec<TaskEntity> build() {
        return ResourceQuerySpec.<TaskEntity>builder()
                .stringFilter("status", TaskEntity::getStatus)
                .stringFilter("sceneCode", TaskEntity::getSceneCode)
                .longFilter("id", TaskEntity::getId)
                .longFilter("ownerId", TaskEntity::getOwnerId)
                .build();
    }
}
