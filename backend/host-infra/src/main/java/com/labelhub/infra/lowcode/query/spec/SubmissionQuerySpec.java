package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.SubmissionEntity;

public final class SubmissionQuerySpec {
    private SubmissionQuerySpec() {
    }

    public static ResourceQuerySpec<SubmissionEntity> build() {
        return ResourceQuerySpec.<SubmissionEntity>builder()
                .longFilter("id", SubmissionEntity::getId)
                .longFilter("assignmentId", SubmissionEntity::getAssignmentId)
                .longFilter("taskId", SubmissionEntity::getTaskId)
                .longFilter("itemId", SubmissionEntity::getItemId)
                .longFilter("labelerId", SubmissionEntity::getLabelerId)
                .stringFilter("currentStatus", SubmissionEntity::getCurrentStatus)
                .stringFilter("status", SubmissionEntity::getCurrentStatus)
                .instantFilter("draftSavedAt", SubmissionEntity::getDraftSavedAt)
                .instantFilter("lastSubmittedAt", SubmissionEntity::getLastSubmittedAt)
                .instantFilter("createdAt", SubmissionEntity::getCreatedAt)
                .instantFilter("updatedAt", SubmissionEntity::getUpdatedAt)
                .sortField("id", SubmissionEntity::getId)
                .sortField("currentStatus", SubmissionEntity::getCurrentStatus)
                .sortField("draftSavedAt", SubmissionEntity::getDraftSavedAt)
                .sortField("lastSubmittedAt", SubmissionEntity::getLastSubmittedAt)
                .sortField("createdAt", SubmissionEntity::getCreatedAt)
                .sortField("updatedAt", SubmissionEntity::getUpdatedAt)
                .build();
    }
}
