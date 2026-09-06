package com.labelhub.infra.authz;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.AuthorizationFacade;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import org.springframework.stereotype.Component;

@Component
public class SecurityAuthorizationFacade implements AuthorizationFacade {
    private final CurrentUserProvider currentUserProvider;

    public SecurityAuthorizationFacade(CurrentUserProvider currentUserProvider) {
        this.currentUserProvider = currentUserProvider;
    }

    @Override
    public void requirePermission(String permission) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (!user.permissions().contains(permission)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
    }

    @Override
    public void requireAnyPermission(String... permissions) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        for (String permission : permissions) {
            if (user.permissions().contains(permission)) {
                return;
            }
        }
        throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
    }

    @Override
    public void requireRole(String role) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (!user.roles().contains(role)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
    }
}
