package com.labelhub.core.service;

import com.labelhub.core.auth.AuthTokens;
import com.labelhub.core.auth.AuthenticatedUser;

public interface AuthService {
    AuthTokens login(String username, String password);

    AuthTokens refresh(String refreshToken);

    void logout(String accessToken);

    void changePassword(String oldPassword, String newPassword);

    AuthenticatedUser requireUser(String accessToken);

    AuthenticatedUser currentUser();
}
