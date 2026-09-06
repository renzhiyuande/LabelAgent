package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.TaskItemEntity;

public final class TaskItemQuerySpec {
    private TaskItemQuerySpec() {
    }

    public static ResourceQuerySpec<TaskItemEntity> build() {
        return ResourceQuerySpec.<TaskItemEntity>builder()
                .longFilter("id", TaskItemEntity::getId)
                .longFilter("taskId", TaskItemEntity::getTaskId)
                .stringFilter("itemStatus", TaskItemEntity::getItemStatus)
                .stringFilter("sourceItemKey", TaskItemEntity::getSourceItemKey)
                .integerFilter("seqNo", TaskItemEntity::getSeqNo)
                .instantFilter("createdAt", TaskItemEntity::getCreatedAt)
                .sortField("seqNo", TaskItemEntity::getSeqNo)
                .sortField("itemStatus", TaskItemEntity::getItemStatus)
                .sortField("createdAt", TaskItemEntity::getCreatedAt)
                .build();
    }
}
