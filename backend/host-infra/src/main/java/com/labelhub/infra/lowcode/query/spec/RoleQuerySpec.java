package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.RoleEntity;

public final class RoleQuerySpec {
    private RoleQuerySpec() {
    }

    public static ResourceQuerySpec<RoleEntity> build() {
        return ResourceQuerySpec.<RoleEntity>builder()
                .stringFilter("status", RoleEntity::getStatus)
                .longFilter("id", RoleEntity::getId)
                .sortField("id", RoleEntity::getId)
                .sortField("roleCode", RoleEntity::getRoleCode)
                .sortField("roleName", RoleEntity::getRoleName)
                .sortField("createdAt", RoleEntity::getCreatedAt)
                .sortField("updatedAt", RoleEntity::getUpdatedAt)
                .build();
    }
}
