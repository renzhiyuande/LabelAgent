package com.labelhub.core.auth;

import java.util.List;
import java.util.Set;

public record AuthenticatedUser(
        Long userId,
        String username,
        String displayName,
        Set<String> roles,
        Set<String> permissions,
        List<String> roleNames,
        Set<String> dataScopeResources) {
    public AuthenticatedUser(Long userId, String username, Set<String> roles) {
        this(userId, username, username, roles, Set.of(), List.of(), Set.of());
    }
}
