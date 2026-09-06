package com.labelhub.infra.system.admin.mapper;

import com.labelhub.core.system.SystemDtos.SystemClientCommand;
import com.labelhub.core.system.SystemDtos.SystemClientSummary;
import com.labelhub.infra.persistence.entity.SystemClientEntity;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SystemClientAdminMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "clientSecretHash", ignore = true)
    @Mapping(target = "ipWhitelistJson", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "lastUsedAt", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedFlag", ignore = true)
    @Mapping(target = "extJson", ignore = true)
    @Mapping(target = "allowedScopesJson", ignore = true)
    void apply(SystemClientCommand command, @MappingTarget SystemClientEntity entity);

    default SystemClientSummary toSummary(SystemClientEntity entity, List<String> allowedScopes) {
        return new SystemClientSummary(
                entity.getId(),
                entity.getClientCode(),
                entity.getClientName(),
                entity.getClientType(),
                allowedScopes,
                entity.getStatus(),
                entity.getLastUsedAt(),
                entity.getExpiresAt(),
                null,
                null,
                null,
                null,
                null);
    }

    SystemClientEntity copy(SystemClientEntity source);
}
