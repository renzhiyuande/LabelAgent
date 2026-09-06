package com.labelhub.core.business.reward;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.math.BigDecimal;
import java.util.Map;

public final class RewardRuleSchemas {

    public static final String NAMESPACE = "rewardRules";

    private RewardRuleSchemas() {
    }

    public static BigDecimal requireBaseAmount(Map<String, Object> rewardRule) {
        if (rewardRule == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "奖励规则缺少 base_amount");
        }
        String mode = readMode(rewardRule);
        return switch (mode) {
            case PerApprovedRewardRuleConfig.MODE -> PerApprovedRewardRuleConfig.from(rewardRule).requireBaseAmount();
            case FixedBonusRewardRuleConfig.MODE -> FixedBonusRewardRuleConfig.from(rewardRule).requireBaseAmount();
            default -> legacyRequireBaseAmount(rewardRule);
        };
    }

    private static String readMode(Map<String, Object> rewardRule) {
        Object mode = rewardRule.get("mode");
        return mode == null ? "" : mode.toString().trim();
    }

    private static BigDecimal legacyRequireBaseAmount(Map<String, Object> rewardRule) {
        Object amount = rewardRule.get("base_amount");
        if (amount == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "奖励规则缺少 base_amount");
        }
        try {
            return new BigDecimal(amount.toString());
        } catch (NumberFormatException ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "奖励规则 base_amount 无效");
        }
    }
}
