package com.labelhub.infra.business.display.container;

import cn.crane4j.annotation.ContainerMethod;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class UserDisplayNameContainer {
    private final UserDisplayNameResolver userDisplayNameResolver;

    public UserDisplayNameContainer(UserDisplayNameResolver userDisplayNameResolver) {
        this.userDisplayNameResolver = userDisplayNameResolver;
    }

    @ContainerMethod(
            namespace = DisplayContainerNamespaces.USER_DISPLAY_NAME,
            resultType = UserDisplayEntry.class,
            resultKey = "userId")
    public List<UserDisplayEntry> listDisplayNames(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        List<UserDisplayEntry> entries = new ArrayList<>();
        for (Long userId : userIds) {
            if (userId != null && userId > 0) {
                entries.add(new UserDisplayEntry(userId, userDisplayNameResolver.resolve(userId)));
            }
        }
        return entries;
    }

    public record UserDisplayEntry(Long userId, String displayName) {
    }
}
