package com.labelhub.infra.business.distribute;

import com.labelhub.core.business.distribute.TaskDistributeStrategy;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** 按 {@code code()} 派发分发策略，仿 RewardStrategyRegistry。 */
@Component
public class DistributeStrategyRegistry {
    private final Map<String, TaskDistributeStrategy> strategies;

    public DistributeStrategyRegistry(List<TaskDistributeStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(TaskDistributeStrategy::code, s -> s));
    }

    public TaskDistributeStrategy requireStrategy(String code) {
        String key = (code == null || code.isBlank())
                ? com.labelhub.core.business.distribute.DistributeStrategy.FIRST_COME
                : code;
        TaskDistributeStrategy strategy = strategies.get(key);
        if (strategy == null) {
            throw new BusinessException(ErrorCode.DISTRIBUTE_STRATEGY_UNSUPPORTED, "不支持的分发策略: " + code);
        }
        return strategy;
    }
}
