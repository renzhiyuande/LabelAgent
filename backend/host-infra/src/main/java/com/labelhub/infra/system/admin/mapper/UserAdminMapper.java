package com.labelhub.infra.system.admin.mapper;

import com.labelhub.core.system.SystemDtos.RoleSummary;
import com.labelhub.core.system.SystemDtos.UserCommand;
import com.labelhub.core.system.SystemDtos.UserSummary;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.entity.UserEntity;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserAdminMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "avatarFileId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "registerSource", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedFlag", ignore = true)
    @Mapping(target = "extJson", ignore = true)
    void applyForCreate(UserCommand command, @MappingTarget UserEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "avatarFileId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "registerSource", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedFlag", ignore = true)
    @Mapping(target = "extJson", ignore = true)
    void applyForUpdate(UserCommand command, @MappingTarget UserEntity entity);

    @Mapping(target = "roles", source = "roles")
    UserSummary toSummary(UserEntity entity, List<RoleSummary> roles);

    @Mapping(target = "permissions", source = "permissions")
    RoleSummary toRoleSummary(RoleEntity entity, java.util.Set<String> permissions);

    @Mapping(target = "passwordHash", ignore = true)
    UserEntity copy(UserEntity source);
}
