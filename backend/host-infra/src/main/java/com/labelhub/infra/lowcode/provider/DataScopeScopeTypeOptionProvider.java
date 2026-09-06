package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.datapermission.DataScopeCatalog;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DataScopeScopeTypeOptionProvider implements LowCodeOptionProvider {

    @Override
    public String optionKey() {
        return "dataScopeScopeTypes";
    }

    @Override
    public String optionLabel() {
        return "数据权限范围类型";
    }

    @Override
    public String requiredPermission() {
        return "system:data-scope:read";
    }

    @Override
    public List<OptionItem> options(OptionRequest request) {
        String resourceType = request.get("resourceType");
        if (resourceType == null || resourceType.isBlank()) {
            resourceType = request.keyword();
        }
        return options(resourceType);
    }

    @Override
    public List<OptionItem> options(String keyword) {
        return DataScopeCatalog.scopeTypesFor(keyword).stream()
                .map(item -> new OptionItem(item.label(), item.value()))
                .toList();
    }
}
