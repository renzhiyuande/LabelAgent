package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import com.labelhub.infra.system.admin.SystemClientAdminService;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SystemClientLowCodeOptionProvider implements LowCodeOptionProvider {
    private final SystemClientAdminService systemClientAdminService;

    public SystemClientLowCodeOptionProvider(SystemClientAdminService systemClientAdminService) {
        this.systemClientAdminService = systemClientAdminService;
    }

    @Override
    public String optionKey() {
        return "systemClients";
    }

    @Override
    public String optionLabel() {
        return "系统客户端";
    }

    @Override
    public String requiredPermission() {
        return "system:admin";
    }

    @Override
    @Cacheable(value = "options", key = "'systemClients:' + (#keyword == null ? '__all__' : #keyword)")
    public List<OptionItem> options(String keyword) {
        return systemClientAdminService.listSystemClients(new PageQuery(1, 100, keyword)).list().stream()
                .map(item -> new OptionItem(item.clientName(), item.id()))
                .toList();
    }
}
