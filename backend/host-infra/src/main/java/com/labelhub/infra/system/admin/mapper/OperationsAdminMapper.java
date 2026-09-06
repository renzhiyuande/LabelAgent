package com.labelhub.infra.system.admin.mapper;

import com.labelhub.core.system.SystemDtos.AsyncTaskSummary;
import com.labelhub.core.system.SystemDtos.AuditLogSummary;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.AuditLogEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OperationsAdminMapper {
    AuditLogSummary toAuditLogSummary(AuditLogEntity entity);

    @Mapping(target = "priority", expression = "java(entity.getPriority() == null ? 0 : entity.getPriority())")
    @Mapping(target = "retryCount", expression = "java(entity.getRetryCount() == null ? 0 : entity.getRetryCount())")
    @Mapping(target = "maxRetryCount", expression = "java(entity.getMaxRetryCount() == null ? 0 : entity.getMaxRetryCount())")
    @Mapping(target = "manualRetryCount", expression = "java(entity.getManualRetryCount() == null ? 0 : entity.getManualRetryCount())")
    AsyncTaskSummary toAsyncTaskSummary(AsyncTaskEntity entity);

    AsyncTaskEntity copy(AsyncTaskEntity source);
}
