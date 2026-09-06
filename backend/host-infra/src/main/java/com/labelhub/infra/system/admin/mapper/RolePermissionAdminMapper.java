package com.labelhub.infra.system.admin.mapper;

import com.labelhub.core.system.SystemDtos.PermissionCommand;
import com.labelhub.core.system.SystemDtos.PermissionSummary;
import com.labelhub.core.system.SystemDtos.RoleCommand;
import com.labelhub.core.system.SystemDtos.RoleSummary;
import com.labelhub.infra.persistence.entity.PermissionEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import java.util.Set;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface RolePermissionAdminMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedFlag", ignore = true)
    @Mapping(target = "extJson", ignore = true)
    void applyRole(RoleCommand command, @MappingTarget RoleEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedFlag", ignore = true)
    @Mapping(target = "extJson", ignore = true)
    void applyPermission(PermissionCommand command, @MappingTarget PermissionEntity entity);

    @Mapping(target = "permissions", source = "permissions")
    RoleSummary toRoleSummary(RoleEntity entity, Set<String> permissions);

    PermissionSummary toPermissionSummary(PermissionEntity entity);

    RoleEntity copy(RoleEntity source);

    PermissionEntity copy(PermissionEntity source);
}
