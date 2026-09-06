package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.AssignmentEntity;

public final class AssignmentQuerySpec {
    private AssignmentQuerySpec() {
    }

    public static ResourceQuerySpec<AssignmentEntity> build() {
        return ResourceQuerySpec.<AssignmentEntity>builder()
                .stringFilter("status", AssignmentEntity::getStatus)
                .longFilter("id", AssignmentEntity::getId)
                .longFilter("taskId", AssignmentEntity::getTaskId)
                .longFilter("itemId", AssignmentEntity::getItemId)
                .longFilter("labelerId", AssignmentEntity::getLabelerId)
                .instantFilter("claimedAt", AssignmentEntity::getClaimedAt)
                .instantFilter("deadlineAt", AssignmentEntity::getDeadlineAt)
                .instantFilter("createdAt", AssignmentEntity::getCreatedAt)
                .instantFilter("updatedAt", AssignmentEntity::getUpdatedAt)
                .sortField("id", AssignmentEntity::getId)
                .sortField("status", AssignmentEntity::getStatus)
                .sortField("claimedAt", AssignmentEntity::getClaimedAt)
                .sortField("deadlineAt", AssignmentEntity::getDeadlineAt)
                .sortField("createdAt", AssignmentEntity::getCreatedAt)
                .sortField("updatedAt", AssignmentEntity::getUpdatedAt)
                .build();
    }
}
