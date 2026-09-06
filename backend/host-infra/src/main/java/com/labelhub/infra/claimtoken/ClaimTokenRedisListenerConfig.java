package com.labelhub.infra.claimtoken;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@ConditionalOnExpression("'${labelhub.auth.mode:db}' == 'db' && '${labelhub.claim-token.stock-reservation-enabled:true}' == 'true'")
public class ClaimTokenRedisListenerConfig {

    @Bean
    RedisMessageListenerContainer claimTokenRedisListenerContainer(
            RedisConnectionFactory connectionFactory,
            ClaimTokenHoldExpiryListener claimTokenHoldExpiryListener) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(claimTokenHoldExpiryListener, new PatternTopic("__keyevent@*__:expired"));
        return container;
    }
}
