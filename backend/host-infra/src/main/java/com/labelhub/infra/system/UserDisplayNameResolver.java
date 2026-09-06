package com.labelhub.infra.system;

import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class UserDisplayNameResolver {
    private final UserMapper userMapper;
    private UserDisplayNameResolver self;

    public UserDisplayNameResolver(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Autowired
    void setSelf(@Lazy UserDisplayNameResolver self) {
        this.self = self;
    }

    public String resolve(Long userId) {
        if (userId == null || userId < 1) {
            return null;
        }
        return self.loadDisplayName(userId);
    }

    public String resolve(Long userId, String fallback) {
        if (userId == null || userId < 1) {
            return fallback;
        }
        String name = self.loadDisplayName(userId);
        if (name == null || name.isBlank()) {
            return fallback;
        }
        return name;
    }

    @Cacheable(value = "userDisplayNames", key = "#userId")
    String loadDisplayName(Long userId) {
        UserEntity user = userMapper.selectById(userId);
        if (user == null || user.getDeletedFlag() == 1) {
            return "User#" + userId;
        }
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName();
        }
        return user.getUsername();
    }
}
