package com.labelhub.infra.lowcode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.infra.lowcode.provider.RewardRuleOptionProvider;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class LowCodeProviderRegistryTest {

    @Test
    void labelerWorkbenchCanLoadRewardRuleOptions() {
        LowCodeProviderRegistry registry = new LowCodeProviderRegistry(
                List.of(),
                List.of(new RewardRuleOptionProvider(new RemoteSchemaRegistry(List.of(), userProvider(null)))),
                userProvider(new AuthenticatedUser(1L, "labeler", "labeler", Set.of("LABELER"),
                        Set.of("business:labeler:workbench"), List.of(), Set.of())));

        List<OptionItem> options = registry.option("rewardRules").options((String) null);

        assertThat(options).isNotNull();
    }

    @Test
    void missingPermissionIsRejectedForRewardRuleOptions() {
        LowCodeProviderRegistry registry = new LowCodeProviderRegistry(
                List.of(),
                List.of(new RewardRuleOptionProvider(new RemoteSchemaRegistry(List.of(), userProvider(null)))),
                userProvider(new AuthenticatedUser(2L, "guest", "guest", Set.of("GUEST"), Set.of(), List.of(), Set.of())));

        assertThatThrownBy(() -> registry.option("rewardRules"))
                .isInstanceOf(BusinessException.class);
    }

    private static CurrentUserProvider userProvider(AuthenticatedUser user) {
        return () -> user;
    }
}
