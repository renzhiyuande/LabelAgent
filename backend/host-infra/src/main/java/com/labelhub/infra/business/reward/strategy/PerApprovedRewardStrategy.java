package com.labelhub.infra.business.reward.strategy;

import com.labelhub.core.business.reward.PerApprovedRewardRuleConfig;
import com.labelhub.core.business.reward.RewardCalculationStrategy;
import com.labelhub.core.business.reward.RewardContext;
import com.labelhub.infra.business.reward.support.RewardRuleAmountSupport;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

/**
 * 按通过条数计酬：每条 APPROVED 提交奖励 reward_rule.base_amount。
 */
@Component
public class PerApprovedRewardStrategy implements RewardCalculationStrategy {
    public static final String MODE = PerApprovedRewardRuleConfig.MODE;

    @Override
    public String mode() {
        return MODE;
    }

    @Override
    public BigDecimal calculate(RewardContext ctx) {
        return RewardRuleAmountSupport.requireBaseAmount(ctx.rewardRule());
    }
}
