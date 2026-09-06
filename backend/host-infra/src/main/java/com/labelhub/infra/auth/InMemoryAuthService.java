package com.labelhub.infra.auth;

import com.labelhub.core.auth.AuthTokens;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.service.AuthService;
import com.labelhub.core.util.DigestUtil;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "memory")
public class InMemoryAuthService implements AuthService {
    private final Map<String, SessionRecord> accessSessions = new ConcurrentHashMap<>();
    private final Map<String, SessionRecord> refreshSessions = new ConcurrentHashMap<>();
    private final Map<String, Credential> knownUsers;
    private final Duration accessTtl;
    private final Duration refreshTtl;
    private final CurrentUserProvider currentUserProvider;

    public InMemoryAuthService(
            @Value("${labelhub.auth.access-ttl-seconds:3600}") long accessTtlSeconds,
            @Value("${labelhub.auth.refresh-ttl-seconds:604800}") long refreshTtlSeconds,
            @Value("${labelhub.auth.memory.admin-password:CHANGE_ME_ADMIN_PASSWORD}") String adminPassword,
            @Value("${labelhub.auth.memory.labeler-password:CHANGE_ME_LABELER_PASSWORD}") String labelerPassword,
            CurrentUserProvider currentUserProvider) {
        this.accessTtl = Duration.ofSeconds(accessTtlSeconds);
        this.refreshTtl = Duration.ofSeconds(refreshTtlSeconds);
        this.currentUserProvider = currentUserProvider;
        this.knownUsers = Map.of(
                "admin",
                new Credential(
                        adminPassword,
                        new AuthenticatedUser(
                                1L,
                                "admin",
                                "Administrator",
                                Set.of("ADMIN"),
                                Set.of("system:admin"),
                                List.of("Administrator"),
                                Set.of())),
                "labeler_001",
                new Credential(
                        labelerPassword,
                        new AuthenticatedUser(
                                2L,
                                "labeler_001",
                                "Labeler One",
                                Set.of("LABELER"),
                                Set.of("system:menu:read"),
                                List.of("Labeler"),
                                Set.of())));
    }

    @Override
    public AuthTokens login(String username, String password) {
        Credential credential = knownUsers.get(username);
        if (credential == null || !credential.password().equals(password)) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }
        return issueTokens(credential.user());
    }

    @Override
    public AuthTokens refresh(String refreshToken) {
        SessionRecord record = refreshSessions.remove(hash(refreshToken));
        if (record == null || record.expiresAt().isBefore(Instant.now())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }
        return issueTokens(record.user());
    }

    @Override
    public void logout(String accessToken) {
        if (accessToken != null && !accessToken.isBlank()) {
            accessSessions.remove(hash(accessToken));
        }
    }

    @Override
    public void changePassword(String oldPassword, String newPassword) {
        // InMemory 模式不支持修改密码
        throw new BusinessException(ErrorCode.AUTH_PASSWORD_COMPLEXITY_NOT_MEET, "演示模式不支持修改密码");
    }

    @Override
    public AuthenticatedUser requireUser(String accessToken) {
        SessionRecord record = accessSessions.get(hash(accessToken));
        if (record == null || record.expiresAt().isBefore(Instant.now())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }
        return record.user();
    }

    @Override
    public AuthenticatedUser currentUser() {
        return currentUserProvider.currentUser();
    }

    private AuthTokens issueTokens(AuthenticatedUser user) {
        String accessToken = token("lh_access");
        String refreshToken = token("lh_refresh");
        Instant now = Instant.now();
        accessSessions.put(hash(accessToken), new SessionRecord(user, now.plus(accessTtl)));
        refreshSessions.put(hash(refreshToken), new SessionRecord(user, now.plus(refreshTtl)));
        return new AuthTokens(accessToken, refreshToken, accessTtl.toSeconds());
    }

    private String token(String prefix) {
        return prefix + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8));
    }

    private String hash(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        return DigestUtil.sha256Base64Url(raw);
    }

    private record Credential(String password, AuthenticatedUser user) {
    }

    private record SessionRecord(AuthenticatedUser user, Instant expiresAt) {
    }
}
