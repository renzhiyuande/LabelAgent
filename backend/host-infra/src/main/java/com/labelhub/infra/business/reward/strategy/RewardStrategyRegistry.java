package com.labelhub.infra.business.reward.strategy;

import com.labelhub.core.business.reward.RewardCalculationStrategy;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class RewardStrategyRegistry {
    private final Map<String, RewardCalculationStrategy> strategies;

    public RewardStrategyRegistry(List<RewardCalculationStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(RewardCalculationStrategy::mode, s -> s));
    }

    public RewardCalculationStrategy requireStrategy(String mode) {
        RewardCalculationStrategy strategy = strategies.get(mode);
        if (strategy == null) {
            throw new BusinessException(ErrorCode.REWARD_RULE_MODE_UNSUPPORTED, "暂不支持的奖励模式: " + mode);
        }
        return strategy;
    }
}
