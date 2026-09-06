package com.labelhub.infra.lowcode;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.LowCodeDtos.ResourceRegistryItem;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public interface LowCodeResourceProvider<T> {
    String resourceKey();

    String label();

    Class<T> summaryType();

    PageResponse<T> query(ListQuery query);

    default Map<String, LowCodeResourceAction> actions() {
        return Map.of();
    }

    default Map<String, LowCodeBulkResourceAction> bulkActions() {
        Map<String, LowCodeResourceAction> singleActions = actions();
        Map<String, LowCodeBulkResourceAction> bulk = new LinkedHashMap<>();
        for (String key : List.of("enable", "disable", "delete")) {
            LowCodeResourceAction single = singleActions.get(key);
            if (single != null) {
                bulk.put(key, ids -> {
                    for (Long id : ids) {
                        single.run(id);
                    }
                });
            }
        }
        return bulk.isEmpty() ? Map.of() : Map.copyOf(bulk);
    }

    default ResourceRegistryItem resourceItem() {
        return new ResourceRegistryItem(resourceKey(), label(), summaryType(), List.copyOf(actions().keySet()));
    }
}
