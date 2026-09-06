package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.ScheduledTaskEntity;

public final class ScheduledTaskQuerySpec {
    private ScheduledTaskQuerySpec() {
    }

    public static ResourceQuerySpec<ScheduledTaskEntity> build() {
        return ResourceQuerySpec.<ScheduledTaskEntity>builder()
                .stringFilter("taskName", ScheduledTaskEntity::getTaskName)
                .stringFilter("taskType", ScheduledTaskEntity::getTaskType)
                .stringFilter("cronExpr", ScheduledTaskEntity::getCronExpr)
                .integerFilter("enabled", ScheduledTaskEntity::getEnabled)
                .sortField("id", ScheduledTaskEntity::getId)
                .sortField("updatedAt", ScheduledTaskEntity::getUpdatedAt)
                .sortField("nextTriggerAt", ScheduledTaskEntity::getNextTriggerAt)
                .sortField("totalTriggerCount", ScheduledTaskEntity::getTotalTriggerCount)
                .build();
    }
}
