package com.labelhub.infra.system.admin.mapper;

import com.labelhub.infra.persistence.entity.AuditLogEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuditTrailMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", constant = "1L")
    @Mapping(target = "createdBy", constant = "0L")
    @Mapping(target = "updatedBy", constant = "0L")
    @Mapping(target = "deletedFlag", constant = "0")
    @Mapping(target = "extJson", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "requestId", ignore = true)
    @Mapping(target = "sourceIp", ignore = true)
    @Mapping(target = "diffJson", ignore = true)
    @Mapping(target = "remark", ignore = true)
    @Mapping(target = "idempotencyKey", ignore = true)
    @Mapping(target = "occurredAt", ignore = true)
    @Mapping(target = "operatorType", constant = "USER")
    @Mapping(target = "operatorId", constant = "0L")
    @Mapping(target = "operatorName", constant = "system")
    @Mapping(target = "traceId", source = "traceId")
    @Mapping(target = "entityType", source = "entityType")
    @Mapping(target = "entityId", source = "entityId")
    @Mapping(target = "actionCode", source = "actionCode")
    @Mapping(target = "beforeJson", source = "beforeJson")
    @Mapping(target = "afterJson", source = "afterJson")
    AuditLogEntity toEntity(String entityType, Long entityId, String actionCode, String traceId, String beforeJson, String afterJson);
}
