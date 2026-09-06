package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;

public final class AsyncTaskQuerySpec {
    private AsyncTaskQuerySpec() {
    }

    public static ResourceQuerySpec<AsyncTaskEntity> build() {
        return ResourceQuerySpec.<AsyncTaskEntity>builder()
                .stringFilter("status", AsyncTaskEntity::getStatus)
                .stringFilter("taskType", AsyncTaskEntity::getTaskType)
                .stringFilter("bizType", AsyncTaskEntity::getBizType)
                .stringFilter("bizKey", AsyncTaskEntity::getBizKey)
                .longFilter("id", AsyncTaskEntity::getId)
                .longFilter("bizId", AsyncTaskEntity::getBizId)
                .integerFilter("priority", AsyncTaskEntity::getPriority)
                .instantFilter("createdAt", AsyncTaskEntity::getCreatedAt)
                .instantFilter("nextRunAt", AsyncTaskEntity::getNextRunAt)
                .sortField("id", AsyncTaskEntity::getId)
                .sortField("updatedAt", AsyncTaskEntity::getUpdatedAt)
                .sortField("nextRunAt", AsyncTaskEntity::getNextRunAt)
                .sortField("createdAt", AsyncTaskEntity::getCreatedAt)
                .sortField("priority", AsyncTaskEntity::getPriority)
                .build();
    }
}
