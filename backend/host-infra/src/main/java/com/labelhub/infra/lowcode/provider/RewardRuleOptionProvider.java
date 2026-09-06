package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import com.labelhub.infra.lowcode.RemoteSchemaRegistry;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class RewardRuleOptionProvider implements LowCodeOptionProvider {
    private static final String NAMESPACE = "rewardRules";
    private final RemoteSchemaRegistry remoteSchemaRegistry;

    public RewardRuleOptionProvider(RemoteSchemaRegistry remoteSchemaRegistry) {
        this.remoteSchemaRegistry = remoteSchemaRegistry;
    }

    @Override
    public String optionKey() {
        return "rewardRules";
    }

    @Override
    public String optionLabel() {
        return "奖励规则";
    }

    @Override
    public String[] requiredPermissions() {
        return new String[] { "business:task:read", "business:labeler:workbench" };
    }

    @Override
    public List<OptionItem> options(String keyword) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        return remoteSchemaRegistry.listByNamespace(NAMESPACE).stream()
                .filter(provider -> normalizedKeyword.isBlank()
                        || provider.key().toLowerCase().contains(normalizedKeyword)
                        || provider.label().toLowerCase().contains(normalizedKeyword))
                .map(provider -> new OptionItem(provider.label(), provider.key()))
                .toList();
    }
}
