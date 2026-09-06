package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.business.distribute.DistributeStrategy;
import com.labelhub.core.business.distribute.TaskDistributeStrategy;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import java.util.Comparator;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DistributeStrategyOptionProvider implements LowCodeOptionProvider {
    private final List<TaskDistributeStrategy> strategies;

    public DistributeStrategyOptionProvider(List<TaskDistributeStrategy> strategies) {
        this.strategies = strategies;
    }

    @Override
    public String optionKey() {
        return "distributeStrategies";
    }

    @Override
    public String optionLabel() {
        return "任务分发策略";
    }

    @Override
    public String requiredPermission() {
        return "business:task:read";
    }

    @Override
    public List<OptionItem> options(String keyword) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        return strategies.stream()
                .filter(strategy -> matchesKeyword(strategy, normalizedKeyword))
                .sorted(Comparator
                        .comparing((TaskDistributeStrategy strategy) -> !DistributeStrategy.isBuiltin(strategy.code()))
                        .thenComparing(TaskDistributeStrategy::label)
                        .thenComparing(TaskDistributeStrategy::code))
                .map(strategy -> new OptionItem(strategy.label(), strategy.code()))
                .toList();
    }

    private boolean matchesKeyword(TaskDistributeStrategy strategy, String keyword) {
        if (keyword.isBlank()) {
            return true;
        }
        return strategy.code().toLowerCase().contains(keyword) || strategy.label().toLowerCase().contains(keyword);
    }
}
