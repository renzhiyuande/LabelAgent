package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.SystemDtos.UserSummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.UserAdminService;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class UserLowCodeProvider extends AbstractLowCodeProvider<UserSummary> {
    private final UserAdminService userAdminService;

    public UserLowCodeProvider(UserAdminService userAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.userAdminService = userAdminService;
    }

    @Override
    public String resourceKey() {
        return "users";
    }

    @Override
    public String label() {
        return "用户";
    }

    @Override
    public Class<UserSummary> summaryType() {
        return UserSummary.class;
    }

    @Override
    public PageResponse<UserSummary> query(ListQuery query) {
        return userAdminService.listUsers(querySupport.parse(query));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "enable", id -> userAdminService.setUserStatus(id, "ACTIVE"),
                "disable", id -> userAdminService.setUserStatus(id, "DISABLED")
        );
    }
}
