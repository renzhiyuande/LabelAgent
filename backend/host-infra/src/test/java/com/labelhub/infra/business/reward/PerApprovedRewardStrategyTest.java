package com.labelhub.infra.business.reward;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.labelhub.core.business.reward.RewardContext;
import com.labelhub.core.error.BusinessException;
import com.labelhub.infra.business.reward.strategy.PerApprovedRewardStrategy;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PerApprovedRewardStrategyTest {

    private final PerApprovedRewardStrategy strategy = new PerApprovedRewardStrategy();

    @Test
    void calculateUsesBaseAmountOnly() {
        BigDecimal amount = strategy.calculate(
                new RewardContext(null, null, null, null, null, Map.of("base_amount", 15)));
        assertThat(amount).isEqualByComparingTo("15");
    }

    @Test
    void calculateRejectsLegacyAmountAlias() {
        assertThatThrownBy(() -> strategy.calculate(
                        new RewardContext(null, null, null, null, null, Map.of("amount", 15))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("base_amount");
    }
}
