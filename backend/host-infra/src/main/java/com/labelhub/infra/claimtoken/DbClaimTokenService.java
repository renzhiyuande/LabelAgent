package com.labelhub.infra.claimtoken;

import com.labelhub.core.claimtoken.ClaimTokenIssueResult;
import com.labelhub.core.claimtoken.ClaimTokenPayloadSupport;
import com.labelhub.core.claimtoken.ClaimTokenRecord;
import com.labelhub.core.claimtoken.ClaimTokenRedemptionResult;
import com.labelhub.core.claimtoken.ClaimTokenScenes;
import com.labelhub.core.claimtoken.ClaimTokenService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbClaimTokenService implements ClaimTokenService {
    private final RedisClaimTokenStore tokenStore;
    private final ClaimTokenHandlerRegistry handlerRegistry;
    private final ClaimTokenStockService claimTokenStockService;

    public DbClaimTokenService(
            RedisClaimTokenStore tokenStore,
            ClaimTokenHandlerRegistry handlerRegistry,
            ClaimTokenStockService claimTokenStockService) {
        this.tokenStore = tokenStore;
        this.handlerRegistry = handlerRegistry;
        this.claimTokenStockService = claimTokenStockService;
    }

    @Override
    public ClaimTokenIssueResult issue(String scene, Long userId, Map<String, Object> payload) {
        if (!StringUtils.hasText(scene)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "scene is required");
        }
        if (userId == null || userId < 1) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        if (!handlerRegistry.supports(scene)) {
            throw new BusinessException(ErrorCode.CLAIM_TOKEN_SCENE_UNSUPPORTED);
        }
        Map<String, Object> safePayload = payload == null ? Map.of() : Map.copyOf(payload);

        String token = claimTokenStockService.generateTokenId();
        Integer reservedCount = null;
        if (claimTokenStockService.isEnabled() && ClaimTokenScenes.LABELER_MARKET.equals(scene)) {
            Long taskId = ClaimTokenPayloadSupport.readLong(safePayload, "taskId");
            if (taskId == null || taskId < 1) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "payload.taskId is required");
            }
            int count = ClaimTokenPayloadSupport.resolveLabelerClaimCount(safePayload, 1);
            long remaining = claimTokenStockService.reserve(taskId, token, count, tokenStore.ttlSeconds());
            reservedCount = count;
            safePayload = enrichPayload(safePayload, count, remaining);
        }

        ClaimTokenRecord record = tokenStore.issueWithToken(token, scene, userId, safePayload);
        return new ClaimTokenIssueResult(record.token(), record.scene(), record.expiresAt(), reservedCount);
    }

    @Override
    public ClaimTokenRedemptionResult redeem(String token, Long userId) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(ErrorCode.CLAIM_TOKEN_INVALID);
        }
        if (userId == null || userId < 1) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }

        // 兑换锁：防止并发重复兑换同一凭证
        String lockToken = tokenStore.tryLockForRedeem(token)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.CLAIM_TOKEN_ALREADY_USED,
                        "凭证正在兑换中或已使用"));
        try {
            // 显式幂等：兑换完成标记的存活远长于 token TTL，覆盖 handler 成功后
            // commitHold/delete 之间的崩溃窗口，防止进程重启后残留凭证被二次兑换。
            if (tokenStore.isRedeemed(token)) {
                throw new BusinessException(ErrorCode.CLAIM_TOKEN_ALREADY_USED, "凭证已兑换");
            }

            // 仅读取，不删除：handler 失败时凭证与 hold 保留，支持重试，
            // 未重试则由 hold/token 过期监听归还库存，避免立即归还与重试冲突
            ClaimTokenRecord record = tokenStore.peek(token)
                    .orElseThrow(() -> new BusinessException(
                            ErrorCode.CLAIM_TOKEN_ALREADY_USED,
                            "凭证无效、已使用或已过期"));
            if (!userId.equals(record.userId())) {
                throw new BusinessException(ErrorCode.CLAIM_TOKEN_USER_MISMATCH);
            }

            Object result = handlerRegistry.requireHandler(record.scene()).redeem(record);

            // 兑换成功：先落幂等标记（防崩溃二次兑换），再删除 hold（避免过期监听重复归还库存）并消费凭证
            tokenStore.markRedeemed(token);
            if (claimTokenStockService.isEnabled() && ClaimTokenScenes.LABELER_MARKET.equals(record.scene())) {
                Long taskId = ClaimTokenPayloadSupport.readLong(record.payload(), "taskId");
                int reservedCount = ClaimTokenPayloadSupport.resolveLabelerClaimCount(record.payload(), 1);
                claimTokenStockService.commitHold(taskId, token, reservedCount);
            }
            tokenStore.delete(token);
            return new ClaimTokenRedemptionResult(record.scene(), result);
        } finally {
            tokenStore.unlockRedeem(token, lockToken);
        }
    }

    private Map<String, Object> enrichPayload(Map<String, Object> payload, int count, long stockRemaining) {
        java.util.HashMap<String, Object> enriched = new java.util.HashMap<>(payload);
        enriched.put("count", count);
        enriched.put("stockRemainingAfterReserve", stockRemaining);
        return Map.copyOf(enriched);
    }
}
