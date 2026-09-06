package com.labelhub.infra.claimtoken;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

/**
 * 监听 hold 键过期，归还未兑换的预占库存。
 * 需 Redis 配置 notify-keyspace-events 含 Ex（例如 {@code Ex} 或 {@code AKE}）。
 */
@Component
@ConditionalOnExpression("'${labelhub.auth.mode:db}' == 'db' && '${labelhub.claim-token.stock-reservation-enabled:true}' == 'true'")
public class ClaimTokenHoldExpiryListener implements MessageListener {
    private final ClaimTokenStockService claimTokenStockService;

    public ClaimTokenHoldExpiryListener(ClaimTokenStockService claimTokenStockService) {
        this.claimTokenStockService = claimTokenStockService;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String key = new String(message.getBody());
        claimTokenStockService.releaseHoldFromExpiredKey(key);
    }
}
