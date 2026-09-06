package com.labelhub.core.authz;

public interface AuthorizationFacade {
    void requirePermission(String permission);

    void requireAnyPermission(String... permissions);

    void requireRole(String role);
}
