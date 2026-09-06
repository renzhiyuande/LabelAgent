package com.labelhub.infra.system.admin.mapper;

import com.labelhub.core.system.SystemDtos.DictItemCommand;
import com.labelhub.core.system.SystemDtos.DictItemSummary;
import com.labelhub.core.system.SystemDtos.DictTypeCommand;
import com.labelhub.core.system.SystemDtos.DictTypeSummary;
import com.labelhub.infra.persistence.entity.DictItemEntity;
import com.labelhub.infra.persistence.entity.DictTypeEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface DictAdminMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedFlag", ignore = true)
    @Mapping(target = "extJson", ignore = true)
    void applyType(DictTypeCommand command, @MappingTarget DictTypeEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedFlag", ignore = true)
    @Mapping(target = "extJson", ignore = true)
    @Mapping(target = "sortNo", ignore = true)
    @Mapping(target = "isDefault", ignore = true)
    void applyItem(DictItemCommand command, @MappingTarget DictItemEntity entity);

    DictTypeSummary toTypeSummary(DictTypeEntity entity);

    @Mapping(target = "sortNo", expression = "java(entity.getSortNo() == null ? 0 : entity.getSortNo())")
    @Mapping(target = "isDefault", expression = "java(entity.getIsDefault() != null && entity.getIsDefault() == 1)")
    DictItemSummary toItemSummary(DictItemEntity entity);

    DictTypeEntity copy(DictTypeEntity source);

    DictItemEntity copy(DictItemEntity source);
}
