package com.labelhub.infra.business.assignment.support;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 任务级抢单分布式锁：串行化「懒创建 assignment」临界区，与 CAS 认领配合使用。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TaskClaimLockSupport {
    private static final String LOCK_PREFIX = "labelhub:claim:task:";
    private static final int MAX_SPIN_RETRIES = 2;
    private static final long SPIN_WAIT_MILLIS = 100;

    private static final DefaultRedisScript<Long> RELEASE_LOCK_SCRIPT = new DefaultRedisScript<>(
            """
                    if redis.call('GET', KEYS[1]) == ARGV[1] then
                      return redis.call('DEL', KEYS[1])
                    else
                      return 0
                    end
                    """,
            Long.class);

    private final StringRedisTemplate stringRedisTemplate;
    private final boolean enabled;
    private final long lockTtlSeconds;

    public TaskClaimLockSupport(
            StringRedisTemplate stringRedisTemplate,
            @Value("${labelhub.claim.lock-enabled:true}") boolean enabled,
            @Value("${labelhub.claim.lock-ttl-seconds:30}") long lockTtlSeconds) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.enabled = enabled;
        this.lockTtlSeconds = Math.max(10, lockTtlSeconds);
    }

    public <T> T executeWithTaskLock(Long taskId, Supplier<T> action) {
        if (!enabled) {
            return runWithDuplicateKeyGuard(action);
        }
        String lockKey = LOCK_PREFIX + taskId;
        String token = UUID.randomUUID().toString();

        for (int attempt = 0; attempt <= MAX_SPIN_RETRIES; attempt++) {
            Boolean acquired = stringRedisTemplate.opsForValue()
                    .setIfAbsent(lockKey, token, Duration.ofSeconds(lockTtlSeconds));
            if (Boolean.TRUE.equals(acquired)) {
                if (TransactionSynchronizationManager.isSynchronizationActive()) {
                    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                        @Override
                        public void afterCompletion(int status) {
                            releaseLock(lockKey, token);
                        }
                    });
                }
                try {
                    return runWithDuplicateKeyGuard(action);
                } finally {
                    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
                        releaseLock(lockKey, token);
                    }
                }
            }
            if (attempt < MAX_SPIN_RETRIES) {
                try {
                    Thread.sleep(SPIN_WAIT_MILLIS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        throw new BusinessException(
                ErrorCode.LABELER_CLAIM_NO_AVAILABLE_ITEMS,
                "抢单繁忙，请稍后重试");
    }

    private void releaseLock(String lockKey, String token) {
        stringRedisTemplate.execute(RELEASE_LOCK_SCRIPT, List.of(lockKey), token);
    }

    private <T> T runWithDuplicateKeyGuard(Supplier<T> action) {
        try {
            return action.get();
        } catch (DuplicateKeyException ex) {
            throw new BusinessException(
                    ErrorCode.LABELER_CLAIM_NO_AVAILABLE_ITEMS,
                    "题目已被其他标注员领取，请重试");
        }
    }
}
