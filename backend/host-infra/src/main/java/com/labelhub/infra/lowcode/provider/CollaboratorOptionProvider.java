package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.business.CollaboratorRole;
import com.labelhub.core.business.UserVisibilityService;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.infra.lowcode.BusinessOptionProvider;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class CollaboratorOptionProvider implements BusinessOptionProvider {
    private final UserVisibilityService userVisibilityService;
    private final CurrentUserProvider currentUserProvider;

    public CollaboratorOptionProvider(
            UserVisibilityService userVisibilityService,
            CurrentUserProvider currentUserProvider) {
        this.userVisibilityService = userVisibilityService;
        this.currentUserProvider = currentUserProvider;
    }

    @Override
    public String optionKey() {
        return "collaborators";
    }

    @Override
    public String optionLabel() {
        return "协作用户";
    }

    @Override
    public String[] requiredPermissions() {
        return new String[] {
            "business:task:read",
            "business:task:update",
            "business:labeler:workbench",
            "business:reviewer:workbench"
        };
    }

    @Override
    @Cacheable(
            value = "businessOptions",
            key = "'collaborators:' + @securityCurrentUserProvider.currentUser().userId() + ':' + (#role == null ? '__any__' : #role) + ':' + (#keyword == null ? '__all__' : #keyword)")
    public List<OptionItem> options(String role, String keyword) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (user == null || user.userId() == null) {
            return List.of();
        }
        CollaboratorRole targetRole = CollaboratorRole.parse(role).orElse(null);
        return userVisibilityService.listVisibleCollaborators(
                user.userId(),
                user.roles(),
                targetRole,
                keyword,
                100);
    }
}
