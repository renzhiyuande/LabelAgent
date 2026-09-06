package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.UserEntity;

public final class UserQuerySpec {
    private UserQuerySpec() {
    }

    public static ResourceQuerySpec<UserEntity> build() {
        return ResourceQuerySpec.<UserEntity>builder()
                .stringFilter("status", UserEntity::getStatus)
                .longFilter("id", UserEntity::getId)
                .sortField("id", UserEntity::getId)
                .sortField("username", UserEntity::getUsername)
                .sortField("displayName", UserEntity::getDisplayName)
                .sortField("lastLoginAt", UserEntity::getLastLoginAt)
                .sortField("createdAt", UserEntity::getCreatedAt)
                .sortField("updatedAt", UserEntity::getUpdatedAt)
                .build();
    }
}
