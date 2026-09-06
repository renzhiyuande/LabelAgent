package com.labelhub.infra.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.auth.AuthenticatedUser;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 认证用户缓存：以 token hash 为 key 缓存 AuthenticatedUser，避免每次请求 5+ 次 DB 查询。
 * TTL 与 access token 对齐；角色/权限变更时按 userId 主动失效。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AuthUserCacheService {
    private static final Logger log = LoggerFactory.getLogger(AuthUserCacheService.class);
    private static final String KEY_PREFIX = "labelhub:auth-user:";
    private static final String USER_TOKENS_PREFIX = "labelhub:auth-user-tokens:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final long ttlSeconds;

    public AuthUserCacheService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper,
            @Value("${labelhub.auth.access-ttl-seconds:3600}") long ttlSeconds) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.ttlSeconds = ttlSeconds;
    }

    public Optional<AuthenticatedUser> get(String tokenHash) {
        String json = redisTemplate.opsForValue().get(KEY_PREFIX + tokenHash);
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, AuthenticatedUser.class));
        } catch (Exception ex) {
            log.warn("Failed to deserialize cached AuthenticatedUser, evicting: {}", ex.getMessage());
            redisTemplate.delete(KEY_PREFIX + tokenHash);
            return Optional.empty();
        }
    }

    public void put(String tokenHash, AuthenticatedUser user) {
        try {
            String json = objectMapper.writeValueAsString(user);
            redisTemplate.opsForValue().set(KEY_PREFIX + tokenHash, json, Duration.ofSeconds(ttlSeconds));
            // 维护 userId → tokenHash 映射（用于按 userId 失效）
            redisTemplate.opsForSet().add(USER_TOKENS_PREFIX + user.userId(), tokenHash);
            redisTemplate.expire(USER_TOKENS_PREFIX + user.userId(), Duration.ofSeconds(ttlSeconds + 60));
        } catch (Exception ex) {
            log.warn("Failed to cache AuthenticatedUser: {}", ex.getMessage());
        }
    }

    public void evict(String tokenHash) {
        redisTemplate.delete(KEY_PREFIX + tokenHash);
    }

    /** 角色/权限变更时按 userId 批量失效所有该用户的缓存。 */
    public void evictByUserId(Long userId) {
        if (userId == null) {
            return;
        }
        var tokenHashes = redisTemplate.opsForSet().members(USER_TOKENS_PREFIX + userId);
        if (tokenHashes != null) {
            for (String hash : tokenHashes) {
                redisTemplate.delete(KEY_PREFIX + hash);
            }
        }
        redisTemplate.delete(USER_TOKENS_PREFIX + userId);
    }

    /** 角色权限变更时批量失效多个用户。 */
    public void evictByUserIds(java.util.Collection<Long> userIds) {
        if (userIds == null) {
            return;
        }
        for (Long userId : userIds) {
            evictByUserId(userId);
        }
    }
}
