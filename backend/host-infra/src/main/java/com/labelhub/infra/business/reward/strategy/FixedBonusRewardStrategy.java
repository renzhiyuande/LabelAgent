package com.labelhub.infra.business.reward.strategy;

import com.labelhub.core.business.reward.FixedBonusRewardRuleConfig;
import com.labelhub.core.business.reward.RewardCalculationStrategy;
import com.labelhub.core.business.reward.RewardContext;
import com.labelhub.infra.business.reward.support.RewardRuleAmountSupport;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

/**
 * 固定奖金模式：每条命中记录直接发放 reward_rule.base_amount。
 */
@Component
public class FixedBonusRewardStrategy implements RewardCalculationStrategy {
    public static final String MODE = FixedBonusRewardRuleConfig.MODE;

    @Override
    public String mode() {
        return MODE;
    }

    @Override
    public BigDecimal calculate(RewardContext ctx) {
        return RewardRuleAmountSupport.requireBaseAmount(ctx.rewardRule());
    }
}
