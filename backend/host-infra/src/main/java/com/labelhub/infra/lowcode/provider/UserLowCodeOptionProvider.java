package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import com.labelhub.infra.system.admin.UserAdminService;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class UserLowCodeOptionProvider implements LowCodeOptionProvider {
    private final UserAdminService userAdminService;

    public UserLowCodeOptionProvider(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @Override
    public String optionKey() {
        return "users";
    }

    @Override
    public String optionLabel() {
        return "用户";
    }

    @Override
    public String requiredPermission() {
        return "system:admin";
    }

    @Override
    @Cacheable(value = "options", key = "'users:' + (#keyword == null ? '__all__' : #keyword)")
    public List<OptionItem> options(String keyword) {
        return userAdminService.listUsers(new PageQuery(1, 100, keyword)).list().stream()
                .map(item -> new OptionItem(item.displayName(), item.id()))
                .toList();
    }
}
