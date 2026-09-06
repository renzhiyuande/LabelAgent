package com.labelhub.infra.lowcode.query.spec;

import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.DictTypeEntity;

public final class DictTypeQuerySpec {
    private DictTypeQuerySpec() {
    }

    public static ResourceQuerySpec<DictTypeEntity> build() {
        return ResourceQuerySpec.<DictTypeEntity>builder()
                .stringFilter("status", DictTypeEntity::getStatus)
                .longFilter("id", DictTypeEntity::getId)
                .sortField("id", DictTypeEntity::getId)
                .sortField("dictCode", DictTypeEntity::getDictCode)
                .sortField("dictName", DictTypeEntity::getDictName)
                .sortField("createdAt", DictTypeEntity::getCreatedAt)
                .sortField("updatedAt", DictTypeEntity::getUpdatedAt)
                .build();
    }
}
