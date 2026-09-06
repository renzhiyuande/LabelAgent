package com.labelhub.infra.business.reward.support;

import com.labelhub.core.business.reward.RewardRuleSchemas;
import java.math.BigDecimal;
import java.util.Map;

public final class RewardRuleAmountSupport {

    private RewardRuleAmountSupport() {
    }

    public static BigDecimal requireBaseAmount(Map<String, Object> rewardRule) {
        return RewardRuleSchemas.requireBaseAmount(rewardRule);
    }
}
