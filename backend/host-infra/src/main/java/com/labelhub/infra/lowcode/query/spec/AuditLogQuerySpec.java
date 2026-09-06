package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.AuditLogEntity;

public final class AuditLogQuerySpec {
    private AuditLogQuerySpec() {
    }

    public static ResourceQuerySpec<AuditLogEntity> build() {
        return ResourceQuerySpec.<AuditLogEntity>builder()
                .stringFilter("entityType", AuditLogEntity::getEntityType)
                .stringFilter("actionCode", AuditLogEntity::getActionCode)
                .longFilter("operatorId", AuditLogEntity::getOperatorId)
                .stringFilter("traceId", AuditLogEntity::getTraceId)
                .instantFilter("occurredAt", AuditLogEntity::getOccurredAt)
                .longFilter("id", AuditLogEntity::getId)
                .sortField("id", AuditLogEntity::getId)
                .sortField("operatorName", AuditLogEntity::getOperatorName)
                .sortField("occurredAt", AuditLogEntity::getOccurredAt)
                .sortField("createdAt", AuditLogEntity::getCreatedAt)
                .sortField("updatedAt", AuditLogEntity::getUpdatedAt)
                .build();
    }
}
