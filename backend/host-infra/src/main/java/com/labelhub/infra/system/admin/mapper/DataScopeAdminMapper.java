package com.labelhub.infra.system.admin.mapper;

import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScopeType;
import com.labelhub.core.system.SystemDtos.DataScopePolicyCommand;
import com.labelhub.core.system.SystemDtos.DataScopePolicySummary;
import com.labelhub.infra.persistence.entity.DataScopePolicyEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", imports = {DataResourceType.class, DataScopeType.class})
public interface DataScopeAdminMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedFlag", ignore = true)
    @Mapping(target = "extJson", ignore = true)
    @Mapping(target = "resourceType", expression = "java(command.resourceType().name())")
    @Mapping(target = "scopeType", expression = "java(command.scopeType().name())")
    void apply(DataScopePolicyCommand command, @MappingTarget DataScopePolicyEntity entity);

    @Mapping(target = "resourceType", expression = "java(DataResourceType.valueOf(entity.getResourceType()))")
    @Mapping(target = "scopeType", expression = "java(DataScopeType.valueOf(entity.getScopeType()))")
    DataScopePolicySummary toSummary(DataScopePolicyEntity entity);
}
