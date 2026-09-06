package com.labelhub.infra.lowcode;

import static org.assertj.core.api.Assertions.assertThat;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("P2 白盒 — RemoteSchemaCacheService")
class RemoteSchemaCacheServiceWhiteBoxTest {

    @Test
    @DisplayName("WB-LC-007: getCachedFormSchema 从 Registry 加载 schema")
    void wbLc007_getCachedFormSchemaLoadsFromRegistry() {
        StubRemoteSchemaProvider provider = new StubRemoteSchemaProvider();
        RemoteSchemaRegistry registry = new RemoteSchemaRegistry(List.of(provider), userProvider(adminUser()));
        RemoteSchemaCacheService cacheService = new RemoteSchemaCacheService(registry);

        Map<String, Object> first = cacheService.getCachedFormSchema("rewardRules", "PER_APPROVED");
        Map<String, Object> second = cacheService.getCachedFormSchema("rewardRules", "PER_APPROVED");

        assertThat(first).containsEntry("type", "object");
        assertThat(second).isEqualTo(first);
        assertThat(provider.loadCount).isEqualTo(2);
    }

    private static CurrentUserProvider userProvider(AuthenticatedUser user) {
        return () -> user;
    }

    private static AuthenticatedUser adminUser() {
        return new AuthenticatedUser(
                1L, "admin", "admin", Set.of("ADMIN"), Set.of("system:admin"), List.of(), Set.of());
    }

    private static final class StubRemoteSchemaProvider implements RemoteSchemaProvider {
        private int loadCount;

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
            return "按通过计酬";
        }

        @Override
        public String[] requiredPermissions() {
            return new String[] {"system:admin"};
        }

        @Override
        public Map<String, Object> formSchema() {
            loadCount++;
            return Map.of("type", "object", "fields", List.of());
        }
    }
}
