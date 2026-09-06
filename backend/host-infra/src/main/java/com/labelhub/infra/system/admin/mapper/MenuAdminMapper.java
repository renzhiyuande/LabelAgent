package com.labelhub.infra.system.admin.mapper;

import com.labelhub.core.system.SystemDtos.MenuCommand;
import com.labelhub.core.system.SystemDtos.MenuNode;
import com.labelhub.infra.persistence.entity.MenuEntity;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface MenuAdminMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "redirectPath", ignore = true)
    @Mapping(target = "cacheFlag", ignore = true)
    @Mapping(target = "affixFlag", ignore = true)
    @Mapping(target = "externalLinkUrl", ignore = true)
    @Mapping(target = "openMode", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedFlag", ignore = true)
    @Mapping(target = "extJson", ignore = true)
    @Mapping(target = "parentId", ignore = true)
    @Mapping(target = "visibleFlag", ignore = true)
    @Mapping(target = "disabledFlag", ignore = true)
    @Mapping(target = "sortNo", ignore = true)
    void apply(MenuCommand command, @MappingTarget MenuEntity entity);

    @Mapping(target = "visible", expression = "java(entity.getVisibleFlag() == null || entity.getVisibleFlag() == 1)")
    @Mapping(target = "disabled", expression = "java(entity.getDisabledFlag() != null && entity.getDisabledFlag() == 1)")
    @Mapping(target = "sortNo", expression = "java(entity.getSortNo() == null ? 0 : entity.getSortNo())")
    @Mapping(target = "keepAlive", expression = "java(entity.getCacheFlag() != null && entity.getCacheFlag() == 1)")
    @Mapping(target = "affix", expression = "java(entity.getAffixFlag() != null && entity.getAffixFlag() == 1)")
    @Mapping(target = "children", source = "children")
    MenuNode toNode(MenuEntity entity, List<MenuNode> children);

    MenuEntity copy(MenuEntity source);
}
