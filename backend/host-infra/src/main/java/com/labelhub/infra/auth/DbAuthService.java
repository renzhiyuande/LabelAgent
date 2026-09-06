package com.labelhub.infra.auth;

import cn.dev33.satoken.stp.StpUtil;
import cn.dev33.satoken.stp.parameter.SaLoginParameter;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.auth.AuthTokens;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.service.AuthService;
import com.labelhub.core.util.TraceContext;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.log.AsyncLogService;
import com.labelhub.infra.persistence.entity.AuthRefreshTokenEntity;
import com.labelhub.infra.persistence.entity.AuthSessionEntity;
import com.labelhub.infra.persistence.entity.LoginLogEntity;
import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.mapper.AuthRefreshTokenMapper;
import com.labelhub.infra.persistence.mapper.AuthSessionMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.security.LoginAttemptService;
import com.labelhub.infra.util.UserAgentParser;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbAuthService implements AuthService {
    private static final Logger log = LoggerFactory.getLogger(DbAuthService.class);

    private final UserMapper userMapper;
    private final AuthSessionMapper authSessionMapper;
    private final AuthRefreshTokenMapper authRefreshTokenMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final CurrentUserProvider currentUserProvider;
    private final LoginAttemptService loginAttemptService;
    private final AsyncLogService asyncLogService;
    private final AuthUserCacheService authUserCacheService;
    private final AuthenticatedUserLoader authenticatedUserLoader;
    private final long accessTokenTtlSeconds;
    private final long refreshTokenTtlSeconds;

    public DbAuthService(
            UserMapper userMapper,
            AuthSessionMapper authSessionMapper,
            AuthRefreshTokenMapper authRefreshTokenMapper,
            BCryptPasswordEncoder passwordEncoder,
            CurrentUserProvider currentUserProvider,
            LoginAttemptService loginAttemptService,
            AsyncLogService asyncLogService,
            AuthUserCacheService authUserCacheService,
            AuthenticatedUserLoader authenticatedUserLoader,
            @Value("${labelhub.auth.access-ttl-seconds:3600}") long accessTokenTtlSeconds,
            @Value("${labelhub.auth.refresh-ttl-seconds:604800}") long refreshTokenTtlSeconds) {
        this.userMapper = userMapper;
        this.authSessionMapper = authSessionMapper;
        this.authRefreshTokenMapper = authRefreshTokenMapper;
        this.passwordEncoder = passwordEncoder;
        this.currentUserProvider = currentUserProvider;
        this.loginAttemptService = loginAttemptService;
        this.asyncLogService = asyncLogService;
        this.authUserCacheService = authUserCacheService;
        this.authenticatedUserLoader = authenticatedUserLoader;
        this.accessTokenTtlSeconds = accessTokenTtlSeconds;
        this.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
    }

    @Override
    @Transactional
    public AuthTokens login(String username, String password) {
        HttpServletRequest request = currentRequest();
        String ipAddr = UserAgentParser.getIpAddr(request);
        String userAgent = request != null ? request.getHeader("User-Agent") : "Unknown";
        String browser = UserAgentParser.getBrowser(userAgent);
        String os = UserAgentParser.getOs(userAgent);

        loginAttemptService.checkLocked(username);

        UserEntity user = null;
        boolean loginSuccess = false;
        String loginMsg = "登录成功";
        Long userId = null;

        try {
            user = userMapper.selectOne(baseUserQuery().eq(UserEntity::getUsername, username));
            if (user == null || !Status.ACTIVE.equals(user.getStatus())
                    || !passwordEncoder.matches(password, user.getPasswordHash())) {
                loginAttemptService.loginFailed(username);
                loginMsg = "用户名或密码错误";
                throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
            }

            userId = user.getId();
            AuthenticatedUser authenticatedUser = authenticatedUserLoader.fromUserEntity(user);
            ensureUserActive(authenticatedUser);

            SaLoginParameter loginParameter = SaLoginParameter.create()
                    .setDevice("WEB")
                    .setTimeout(3600)
                    .setExtra("traceId", TraceContext.currentTraceId());
            StpUtil.login(user.getId(), loginParameter);
            String accessToken = StpUtil.getTokenValue();
            String refreshToken = "lh_refresh." + UUID.randomUUID();
            Instant now = Instant.now();
            Instant accessExpiresAt = now.plusSeconds(accessTokenTtlSeconds);
            Instant refreshExpiresAt = now.plusSeconds(refreshTokenTtlSeconds);

            AuthSessionEntity session = new AuthSessionEntity();
            session.setUserId(user.getId());
            session.setLoginType("PASSWORD");
            session.setClientType("WEB");
            session.setAccessJti(accessToken);
            session.setAccessTokenHash(sha256(accessToken));
            session.setIpAddress(ipAddr);
            session.setUserAgent(userAgent);
            session.setStatus(Status.ACTIVE);
            session.setIssuedAt(now);
            session.setAccessExpiresAt(accessExpiresAt);
            session.setRefreshExpiresAt(refreshExpiresAt);
            session.setLastSeenAt(now);
            authSessionMapper.insert(session);

            AuthRefreshTokenEntity refresh = new AuthRefreshTokenEntity();
            refresh.setSessionId(session.getId());
            refresh.setUserId(user.getId());
            refresh.setRefreshTokenHash(sha256(refreshToken));
            refresh.setRotateNo(1);
            refresh.setStatus(Status.ACTIVE);
            refresh.setIssuedAt(now);
            refresh.setExpiresAt(refreshExpiresAt);
            authRefreshTokenMapper.insert(refresh);

            user.setLastLoginAt(now);
            userMapper.updateById(user);

            loginAttemptService.loginSuccess(username);
            loginSuccess = true;

            return new AuthTokens(accessToken, refreshToken, 3600);
        } finally {
            recordLoginLogAsync(username, userId, ipAddr, browser, os, userAgent, loginSuccess, loginMsg);
        }
    }

    private void recordLoginLogAsync(String username, Long userId, String ipAddr, String browser, String os,
                                      String deviceInfo, boolean success, String msg) {
        try {
            LoginLogEntity logEntity = new LoginLogEntity();
            logEntity.setUsername(username);
            logEntity.setUserId(userId);
            logEntity.setLoginIp(ipAddr);
            logEntity.setBrowser(browser);
            logEntity.setOs(os);
            logEntity.setDeviceInfo(deviceInfo);
            logEntity.setLoginLocation("");
            logEntity.setLoginStatus(success ? 0 : 1);
            logEntity.setMsg(msg);
            logEntity.setLoginTime(LocalDateTime.now());
            asyncLogService.saveLoginLogAsync(logEntity);
        } catch (Exception ex) {
            log.error("Failed to submit async login log task, username={}", username, ex);
        }
    }

    @Override
    @Transactional
    public AuthTokens refresh(String refreshToken) {
        AuthRefreshTokenEntity refresh = authRefreshTokenMapper.selectOne(
                new LambdaQueryWrapper<AuthRefreshTokenEntity>()
                        .eq(AuthRefreshTokenEntity::getDeletedFlag, 0)
                        .eq(AuthRefreshTokenEntity::getRefreshTokenHash, sha256(refreshToken))
                        .eq(AuthRefreshTokenEntity::getStatus, Status.ACTIVE));
        if (refresh == null || refresh.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        UserEntity user = userMapper.selectById(refresh.getUserId());
        if (user == null || user.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        refresh.setStatus(Status.DISABLED);
        refresh.setUsedAt(Instant.now());
        authRefreshTokenMapper.updateById(refresh);

        StpUtil.login(user.getId(), SaLoginParameter.create().setDevice("WEB").setTimeout(3600));
        String accessToken = StpUtil.getTokenValue();
        String newRefreshToken = "lh_refresh." + UUID.randomUUID();
        Instant now = Instant.now();

        AuthSessionEntity session = authSessionMapper.selectById(refresh.getSessionId());
        session.setAccessJti(accessToken);
        session.setAccessTokenHash(sha256(accessToken));
        session.setAccessExpiresAt(now.plusSeconds(accessTokenTtlSeconds));
        session.setRefreshExpiresAt(now.plusSeconds(refreshTokenTtlSeconds));
        session.setLastSeenAt(now);
        session.setStatus(Status.ACTIVE);
        authSessionMapper.updateById(session);

        AuthRefreshTokenEntity next = new AuthRefreshTokenEntity();
        next.setSessionId(session.getId());
        next.setUserId(user.getId());
        next.setRefreshTokenHash(sha256(newRefreshToken));
        next.setRotateNo(refresh.getRotateNo() + 1);
        next.setStatus(Status.ACTIVE);
        next.setIssuedAt(now);
        next.setExpiresAt(now.plusSeconds(refreshTokenTtlSeconds));
        authRefreshTokenMapper.insert(next);

        return new AuthTokens(accessToken, newRefreshToken, accessTokenTtlSeconds);
    }

    @Override
    @Transactional
    public void changePassword(String oldPassword, String newPassword) {
        AuthenticatedUser current = currentUserProvider.currentUser();
        UserEntity user = userMapper.selectById(current.userId());
        if (user == null || user.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND);
        }
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.AUTH_PASSWORD_WRONG, "当前密码不正确");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.AUTH_PASSWORD_SAME_AS_OLD, "新密码不能与旧密码相同");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userMapper.updateById(user);
        log.info("Password changed for userId={}", current.userId());
    }

    @Override
    @Transactional
    public void logout(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return;
        }
        AuthSessionEntity session = authSessionMapper.selectOne(new LambdaQueryWrapper<AuthSessionEntity>()
                .eq(AuthSessionEntity::getDeletedFlag, 0)
                .eq(AuthSessionEntity::getAccessTokenHash, sha256(accessToken)));
        if (session != null) {
            session.setStatus(Status.DISABLED);
            session.setLogoutAt(Instant.now());
            session.setRevokedAt(Instant.now());
            session.setRevokeReason("LOGOUT");
            authSessionMapper.updateById(session);

            List<AuthRefreshTokenEntity> refreshTokens = authRefreshTokenMapper.selectList(
                    new LambdaQueryWrapper<AuthRefreshTokenEntity>()
                            .eq(AuthRefreshTokenEntity::getDeletedFlag, 0)
                            .eq(AuthRefreshTokenEntity::getSessionId, session.getId())
                            .eq(AuthRefreshTokenEntity::getStatus, Status.ACTIVE));
            for (AuthRefreshTokenEntity refreshToken : refreshTokens) {
                refreshToken.setStatus(Status.DISABLED);
                refreshToken.setRevokedAt(Instant.now());
                refreshToken.setRevokeReason("LOGOUT");
                authRefreshTokenMapper.updateById(refreshToken);
            }
        }
        authUserCacheService.evict(sha256(accessToken));
        StpUtil.logoutByTokenValue(accessToken);
    }

    private static final long LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000L;

    @Override
    public AuthenticatedUser requireUser(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        String tokenHash = sha256(accessToken);

        // 优先从 Redis 缓存取（跳过 5+ 次 DB 查询）
        var cached = authUserCacheService.get(tokenHash);
        if (cached.isPresent()) {
            return cached.get();
        }

        // 缓存未命中：走 DB 查询
        AuthSessionEntity session = authSessionMapper.selectOne(new LambdaQueryWrapper<AuthSessionEntity>()
                .eq(AuthSessionEntity::getDeletedFlag, 0)
                .eq(AuthSessionEntity::getAccessTokenHash, tokenHash));
        if (session == null || !Status.ACTIVE.equals(session.getStatus())
                || session.getAccessExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }
        UserEntity user = userMapper.selectById(session.getUserId());
        if (user == null || user.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }
        AuthenticatedUser authenticatedUser = authenticatedUserLoader.fromUserEntity(user);
        ensureUserActive(authenticatedUser);

        // 写入缓存
        authUserCacheService.put(tokenHash, authenticatedUser);

        // last_seen_at 节流：5 分钟内不重复写 DB
        if (session.getLastSeenAt() == null
                || Instant.now().toEpochMilli() - session.getLastSeenAt().toEpochMilli() > LAST_SEEN_THROTTLE_MS) {
            session.setLastSeenAt(Instant.now());
            authSessionMapper.updateById(session);
        }
        return authenticatedUser;
    }

    @Override
    public AuthenticatedUser currentUser() {
        return currentUserProvider.currentUser();
    }

    private LambdaQueryWrapper<UserEntity> baseUserQuery() {
        return new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getDeletedFlag, 0)
                .eq(UserEntity::getTenantId, 1L);
    }

    private void ensureUserActive(AuthenticatedUser user) {
        UserEntity persistentUser = userMapper.selectById(user.userId());
        if (persistentUser == null || persistentUser.getDeletedFlag() == 1
                || !Status.ACTIVE.equals(persistentUser.getStatus()) || user.roles().isEmpty()) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
    }

    private HttpServletRequest currentRequest() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletRequestAttributes) {
            return servletRequestAttributes.getRequest();
        }
        return null;
    }

    private String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
