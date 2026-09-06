package com.labelhub.infra.system;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class CurrentUserContext {
    private final CurrentUserProvider currentUserProvider;

    public CurrentUserContext(CurrentUserProvider currentUserProvider) {
        this.currentUserProvider = currentUserProvider;
    }

    public AuthenticatedUser userOrNull() {
        try {
            return currentUserProvider.currentUser();
        } catch (BusinessException ex) {
            if (ex.errorCode() == ErrorCode.AUTH_UNAUTHENTICATED) {
                return null;
            }
            throw ex;
        }
    }

    public Long userIdOrZero() {
        AuthenticatedUser user = userOrNull();
        if (user == null || user.userId() == null) {
            return 0L;
        }
        return user.userId();
    }

    public Long requireUserId() {
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (user.userId() == null) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        return user.userId();
    }
}
