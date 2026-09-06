package com.labelhub.infra.lowcode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RemoteSchemaRegistryTest {

    @Test
    void systemAdminCanAccessProviderProtectedByBusinessPermissions() {
        RemoteSchemaRegistry registry = new RemoteSchemaRegistry(
                List.of(new StubRemoteSchemaProvider()),
                userProvider(new AuthenticatedUser(1L, "admin", "admin", Set.of("ADMIN"), Set.of("system:admin"),
                        List.of(), Set.of())));

        RemoteSchemaProvider provider = registry.requireProvider("rewardRules", "PER_APPROVED");

        assertThat(provider.key()).isEqualTo("PER_APPROVED");
    }

    @Test
    void missingPermissionIsRejected() {
        RemoteSchemaRegistry registry = new RemoteSchemaRegistry(
                List.of(new StubRemoteSchemaProvider()),
                userProvider(new AuthenticatedUser(2L, "owner", "owner", Set.of("OWNER"),
                        Set.of("business:task:create"), List.of(), Set.of())));

        assertThatThrownBy(() -> registry.requireProvider("rewardRules", "PER_APPROVED"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void labelerWorkbenchCanAccessWhenProviderAllowsIt() {
        RemoteSchemaRegistry registry = new RemoteSchemaRegistry(
                List.of(new StubRemoteSchemaProvider()),
                userProvider(new AuthenticatedUser(3L, "labeler", "labeler", Set.of("LABELER"),
                        Set.of("business:labeler:workbench"), List.of(), Set.of())));

        RemoteSchemaProvider provider = registry.requireProvider("rewardRules", "PER_APPROVED");

        assertThat(provider.key()).isEqualTo("PER_APPROVED");
    }

    private static CurrentUserProvider userProvider(AuthenticatedUser user) {
        return () -> user;
    }

    private static final class StubRemoteSchemaProvider implements RemoteSchemaProvider {
        @Override
        public String namespace() {
            return "rewardRules";
        }

        @Override
        public String key() {
            return "PER_APPROVED";
        }

        @Override
        public String label() {
            return "按通过条数计奖";
        }

        @Override
        public Map<String, Object> formSchema() {
            return Map.of("sections", List.of(), "actions", List.of());
        }

        @Override
        public String[] requiredPermissions() {
            return new String[] {
                "business:task:read", "business:task:update", "business:labeler:workbench"
            };
        }
    }
}
