package com.labelhub.infra.business.display.container;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labelhub.infra.persistence.entity.AbstractEntity;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** Crane4j 展示容器按 ID 批量加载实体，统一过滤软删记录。 */
public final class DisplayContainerBatchLoader {
    private DisplayContainerBatchLoader() {
    }

    public static <T extends AbstractEntity> List<T> loadSoftDeleted(BaseMapper<T> mapper, Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<T> result = new ArrayList<>();
        for (T entity : mapper.selectBatchIds(ids)) {
            if (entity != null && entity.getDeletedFlag() != null && entity.getDeletedFlag() == 0) {
                result.add(entity);
            }
        }
        return result;
    }
}
