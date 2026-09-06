package com.labelhub.infra.business.reward;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.labelhub.core.error.BusinessException;
import com.labelhub.infra.business.reward.support.RewardRuleAmountSupport;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RewardRuleAmountSupportTest {

    @Test
    void readsCanonicalBaseAmount() {
        assertThat(RewardRuleAmountSupport.requireBaseAmount(Map.of("base_amount", 12)))
                .isEqualByComparingTo("12");
    }

    @Test
    void rejectsMissingBaseAmount() {
        assertThatThrownBy(() -> RewardRuleAmountSupport.requireBaseAmount(Map.of("amount", 12)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("base_amount");
    }
}
