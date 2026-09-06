package com.labelhub.infra.claimtoken;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.statemachine.AssignmentStatus;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

/**
 * 抢单凭证库存预占：签发 token 时扣减 Redis 库存，兑换成功消耗预占，失败/过期归还。
 */
@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ClaimTokenStockService {
    private static final String STOCK_KEY_PREFIX = "labelhub:claim-stock:";
    private static final String HOLD_KEY_PREFIX = "labelhub:claim-stock-hold:";
    private static final String RELEASED_MARK_PREFIX = "labelhub:claim-released:";

    private static final DefaultRedisScript<Long> RESERVE_SCRIPT = new DefaultRedisScript<>(
            """
                    local stockKey = KEYS[1]
                    local holdKey = KEYS[2]
                    local count = tonumber(ARGV[1])
                    local ttl = tonumber(ARGV[2])
                    local stock = redis.call('GET', stockKey)
                    if not stock then
                      return -2
                    end
                    stock = tonumber(stock)
                    if stock < count then
                      return -1
                    end
                    redis.call('SET', holdKey, '1', 'EX', ttl)
                    redis.call('DECRBY', stockKey, count)
                    return stock - count
                    """,
            Long.class);

    private static final DefaultRedisScript<Long> SAFE_RELEASE_SCRIPT = new DefaultRedisScript<>(
            """
                    local stockKey = KEYS[1]
                    local releasedMarkKey = KEYS[2]
                    local maxStock = tonumber(ARGV[1])
                    local count = tonumber(ARGV[2])
                    if redis.call('EXISTS', releasedMarkKey) == 1 then
                      return 0
                    end
                    local currentStock = redis.call('GET', stockKey)
                    if not currentStock then
                      currentStock = 0
                    end
                    currentStock = tonumber(currentStock)
                    if currentStock + count > maxStock then
                      redis.call('SET', stockKey, maxStock)
                      redis.call('SET', releasedMarkKey, '1', 'EX', 86400)
                      return 1
                    end
                    redis.call('INCRBY', stockKey, count)
                    redis.call('SET', releasedMarkKey, '1', 'EX', 86400)
                    return 1
                    """,
            Long.class);

    private final StringRedisTemplate stringRedisTemplate;
    private final AssignmentMapper assignmentMapper;
    private final boolean enabled;

    public ClaimTokenStockService(
            StringRedisTemplate stringRedisTemplate,
            AssignmentMapper assignmentMapper,
            @Value("${labelhub.claim-token.stock-reservation-enabled:true}") boolean enabled) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.assignmentMapper = assignmentMapper;
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public String generateTokenId() {
        byte[] bytes = new byte[16];
        SECURE_RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public void initializeStock(Long taskId, long availableCount) {
        if (!enabled || taskId == null || taskId < 1 || availableCount < 0) {
            return;
        }
        stringRedisTemplate.opsForValue().set(stockKey(taskId), String.valueOf(availableCount));
    }

    /** QUOTA 放量：在现有库存上累加（INCRBY），返回累加后的可领余量。 */
    public long incrementStock(Long taskId, long delta) {
        if (!enabled || taskId == null || taskId < 1 || delta <= 0) {
            return 0L;
        }
        Long result = stringRedisTemplate.opsForValue().increment(stockKey(taskId), delta);
        return result == null ? 0L : result;
    }

    public void syncStockFromDatabase(Long taskId) {
        if (!enabled || taskId == null || taskId < 1) {
            return;
        }
        long unclaimed = countUnclaimedAssignments(taskId);
        long inFlight = countInFlightHolds(taskId);
        initializeStock(taskId, Math.max(0, unclaimed - inFlight));
    }

    /**
     * @return 预占后剩余可签发库存（Redis 计数）
     */
    public long reserve(Long taskId, String token, int count, long ttlSeconds) {
        if (!enabled) {
            return -1;
        }
        if (taskId == null || taskId < 1 || token == null || token.isBlank() || count < 1) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid stock reservation request");
        }
        Long result = tryReserveOnce(taskId, token, count, ttlSeconds);
        if (result != null && result == -2) {
            syncStockFromDatabase(taskId);
            result = tryReserveOnce(taskId, token, count, ttlSeconds);
        }
        if (result == null) {
            throw new BusinessException(ErrorCode.CACHE_OPERATION_FAILED, "Stock reservation failed");
        }
        if (result == -2) {
            throw new BusinessException(ErrorCode.CLAIM_TOKEN_STOCK_NOT_READY);
        }
        if (result == -1) {
            throw new BusinessException(ErrorCode.CLAIM_TOKEN_STOCK_INSUFFICIENT);
        }
        return result;
    }

    /** 兑换开始：删除 hold，避免过期监听器重复归还库存 */
    public void commitHold(Long taskId, String token, int count) {
        if (!enabled || taskId == null || token == null) {
            return;
        }
        stringRedisTemplate.delete(holdKey(taskId, count, token));
    }

    /** 兑换失败或取消：归还库存（安全原子版本，防重复归还） */
    public void releaseStock(Long taskId, int count, String token) {
        if (!enabled || taskId == null || taskId < 1 || count < 1) {
            return;
        }
        long maxStock = countUnclaimedAssignments(taskId) - countInFlightHolds(taskId);
        stringRedisTemplate.execute(
                SAFE_RELEASE_SCRIPT,
                List.of(stockKey(taskId), releasedMarkKey(taskId, count, token)),
                String.valueOf(maxStock),
                String.valueOf(count));
    }

    /** hold 键过期（未 redeem）：归还库存 */
    public void releaseHoldFromExpiredKey(String expiredHoldKey) {
        if (!enabled || expiredHoldKey == null || !expiredHoldKey.startsWith(HOLD_KEY_PREFIX)) {
            return;
        }
        String suffix = expiredHoldKey.substring(HOLD_KEY_PREFIX.length());
        String[] parts = suffix.split(":", 3);
        if (parts.length != 3) {
            return;
        }
        try {
            Long taskId = Long.parseLong(parts[0]);
            int count = Integer.parseInt(parts[1]);
            String token = parts[2];
            releaseStock(taskId, count, token);
        } catch (NumberFormatException ignored) {
            // ignore malformed key
        }
    }

    private Long tryReserveOnce(Long taskId, String token, int count, long ttlSeconds) {
        return stringRedisTemplate.execute(
                RESERVE_SCRIPT,
                List.of(stockKey(taskId), holdKey(taskId, count, token)),
                String.valueOf(count),
                String.valueOf(Math.max(30, ttlSeconds)));
    }

    private long countUnclaimedAssignments(Long taskId) {
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getTaskId, taskId)
                .eq(AssignmentEntity::getStatus, AssignmentStatus.UNCLAIMED.name());
        Long count = assignmentMapper.selectCount(wrapper);
        return count == null ? 0L : count;
    }

    /**
     * 统计任务在途 hold 数量（已签发未兑换的凭证预占数）。
     * 使用 SCAN 游标遍历该任务的 hold key，避免 KEYS 阻塞 Redis。
     */
    private long countInFlightHolds(Long taskId) {
        if (taskId == null || taskId < 1) {
            return 0L;
        }
        String pattern = HOLD_KEY_PREFIX + taskId + ":*";
        ScanOptions options = ScanOptions.scanOptions().match(pattern).count(256).build();
        long total = 0L;
        try (Cursor<String> cursor = stringRedisTemplate.scan(options)) {
            while (cursor.hasNext()) {
                String key = cursor.next();
                String suffix = key.substring(HOLD_KEY_PREFIX.length());
                String[] parts = suffix.split(":", 3);
                if (parts.length >= 2) {
                    try {
                        total += Integer.parseInt(parts[1]);
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }
        return total;
    }

    private String stockKey(Long taskId) {
        return STOCK_KEY_PREFIX + taskId;
    }

    private String releasedMarkKey(Long taskId, int count, String token) {
        return RELEASED_MARK_PREFIX + taskId + ":" + count + ":" + token;
    }

    static String holdKey(Long taskId, int count, String token) {
        return HOLD_KEY_PREFIX + taskId + ":" + count + ":" + token;
    }
}
