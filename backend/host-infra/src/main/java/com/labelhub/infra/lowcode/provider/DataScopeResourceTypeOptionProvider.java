package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.datapermission.DataScopeCatalog;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DataScopeResourceTypeOptionProvider implements LowCodeOptionProvider {

    @Override
    public String optionKey() {
        return "dataScopeResourceTypes";
    }

    @Override
    public String optionLabel() {
        return "数据权限资源类型";
    }

    @Override
    public String requiredPermission() {
        return "system:data-scope:read";
    }

    @Override
    public List<OptionItem> options(String keyword) {
        return DataScopeCatalog.resourceTypes().stream()
                .filter(item -> matchesKeyword(item, keyword))
                .map(item -> new OptionItem(item.label(), item.value()))
                .toList();
    }

    private boolean matchesKeyword(DataScopeCatalog.LabeledOption item, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }
        String lower = keyword.trim().toLowerCase();
        return item.value().toLowerCase().contains(lower) || item.label().toLowerCase().contains(lower);
    }
}
