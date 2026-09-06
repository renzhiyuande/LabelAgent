package com.labelhub.core.business.reward;

import java.math.BigDecimal;

/**
 * 奖励计算策略 SPI。按 {@code reward_rule_json.mode} 选择实现，支持插件化扩展。
 * 首版内置 PER_APPROVED 单价模式，后续模式（如 PER_QUALITY）新增实现类即可，结算主流程不变。
 */
public interface RewardCalculationStrategy {
    String mode();

    BigDecimal calculate(RewardContext ctx);
}
