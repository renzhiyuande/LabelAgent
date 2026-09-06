package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.TaskMemberEntity;

public final class TaskMemberQuerySpec {
    private TaskMemberQuerySpec() {
    }

    public static ResourceQuerySpec<TaskMemberEntity> build() {
        return ResourceQuerySpec.<TaskMemberEntity>builder()
                .longFilter("taskId", TaskMemberEntity::getTaskId)
                .longFilter("userId", TaskMemberEntity::getUserId)
                .stringFilter("memberRole", TaskMemberEntity::getMemberRole)
                .stringFilter("status", TaskMemberEntity::getStatus)
                .sortField("id", TaskMemberEntity::getId)
                .sortField("joinedAt", TaskMemberEntity::getJoinedAt)
                .build();
    }
}
