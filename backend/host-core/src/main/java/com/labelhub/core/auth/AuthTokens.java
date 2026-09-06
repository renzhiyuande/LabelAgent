package com.labelhub.core.auth;

public record AuthTokens(String accessToken, String refreshToken, long expiresInSeconds) {
}

