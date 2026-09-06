package com.labelhub.infra.claimtoken;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.claimtoken.ClaimTokenRecord;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class RedisClaimTokenStore {
    private static final String KEY_PREFIX = "labelhub:claim-token:";
    private static final String REDEEM_LOCK_PREFIX = "labelhub:claim-token-redeem-lock:";
    private static final String REDEEMED_MARK_PREFIX = "labelhub:claim-token-redeemed:";
    // 兑换完成标记的存活时间需远大于 token TTL，覆盖 commitHold 与 delete 之间的崩溃窗口，
    // 防止进程重启后凭证残留被二次兑换。
    private static final Duration REDEEMED_MARK_TTL = Duration.ofHours(24);
    private static final DefaultRedisScript<String> CONSUME_SCRIPT = new DefaultRedisScript<>(
            """
                    local value = redis.call('GET', KEYS[1])
                    if not value then
                      return nil
                    end
                    redis.call('DEL', KEYS[1])
                    return value
                    """,
            String.class);

    private static final DefaultRedisScript<Long> UNLOCK_SCRIPT = new DefaultRedisScript<>(
            """
                    if redis.call('GET', KEYS[1]) == ARGV[1] then
                      return redis.call('DEL', KEYS[1])
                    else
                      return 0
                    end
                    """,
            Long.class);

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final long ttlSeconds;

    public RedisClaimTokenStore(
            StringRedisTemplate stringRedisTemplate,
            ObjectMapper objectMapper,
            @Value("${labelhub.claim-token.ttl-seconds:120}") long ttlSeconds) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.objectMapper = objectMapper;
        this.ttlSeconds = Math.max(30, ttlSeconds);
    }

    public ClaimTokenRecord issue(String scene, Long userId, Map<String, Object> payload) {
        return issueWithToken(UUID.randomUUID().toString().replace("-", ""), scene, userId, payload);
    }

    public ClaimTokenRecord issueWithToken(String token, String scene, Long userId, Map<String, Object> payload) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusSeconds(ttlSeconds);
        StoredClaimToken stored = new StoredClaimToken(scene, userId, payload, issuedAt, expiresAt);
        String key = key(token);
        try {
            stringRedisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(stored), Duration.ofSeconds(ttlSeconds));
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.CACHE_OPERATION_FAILED, "Failed to store claim token");
        }
        return new ClaimTokenRecord(token, scene, userId, payload, issuedAt, expiresAt);
    }

    public long ttlSeconds() {
        return ttlSeconds;
    }

    /** 读取并原子删除凭证（旧行为，兑换失败无法重试） */
    public Optional<ClaimTokenRecord> consume(String token) {
        String json = stringRedisTemplate.execute(CONSUME_SCRIPT, List.of(key(token)));
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        return parseRecord(token, json);
    }

    /** 仅读取凭证，不删除（支持失败重试） */
    public Optional<ClaimTokenRecord> peek(String token) {
        String json = stringRedisTemplate.opsForValue().get(key(token));
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        return parseRecord(token, json);
    }

    /** 显式删除凭证 */
    public void delete(String token) {
        stringRedisTemplate.delete(key(token));
    }

    /** 是否已兑换完成（显式幂等标记，独立于 token 自身的存活）。 */
    public boolean isRedeemed(String token) {
        return Boolean.TRUE.equals(stringRedisTemplate.hasKey(redeemedMarkKey(token)));
    }

    /** 标记凭证兑换完成。需在 handler 成功后、删除凭证前写入，覆盖崩溃窗口。 */
    public void markRedeemed(String token) {
        stringRedisTemplate.opsForValue().set(redeemedMarkKey(token), "1", REDEEMED_MARK_TTL);
    }

    /**
     * 获取凭证兑换锁，保证并发下单次兑换。
     * @return 锁 token，释放时需回传；获取失败返回 empty
     */
    public Optional<String> tryLockForRedeem(String token) {
        String lockToken = UUID.randomUUID().toString();
        Boolean acquired = stringRedisTemplate.opsForValue()
                .setIfAbsent(redeemLockKey(token), lockToken, Duration.ofSeconds(Math.max(30, ttlSeconds)));
        return Boolean.TRUE.equals(acquired) ? Optional.of(lockToken) : Optional.empty();
    }

    /** 释放兑换锁（仅当持有者匹配） */
    public void unlockRedeem(String token, String lockToken) {
        stringRedisTemplate.execute(UNLOCK_SCRIPT, List.of(redeemLockKey(token)), lockToken);
    }

    private Optional<ClaimTokenRecord> parseRecord(String token, String json) {
        try {
            StoredClaimToken stored = objectMapper.readValue(json, StoredClaimToken.class);
            if (stored.expiresAt() != null && Instant.now().isAfter(stored.expiresAt())) {
                return Optional.empty();
            }
            return Optional.of(new ClaimTokenRecord(
                    token,
                    stored.scene(),
                    stored.userId(),
                    stored.payload() == null ? Map.of() : stored.payload(),
                    stored.issuedAt(),
                    stored.expiresAt()));
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.CACHE_OPERATION_FAILED, "Failed to read claim token");
        }
    }

    private String key(String token) {
        return KEY_PREFIX + token;
    }

    private String redeemLockKey(String token) {
        return REDEEM_LOCK_PREFIX + token;
    }

    private String redeemedMarkKey(String token) {
        return REDEEMED_MARK_PREFIX + token;
    }

    private record StoredClaimToken(
            String scene,
            Long userId,
            Map<String, Object> payload,
            Instant issuedAt,
            Instant expiresAt) {
    }
}
