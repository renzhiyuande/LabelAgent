package com.labelhub.infra.lowcode;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

@SpringJUnitConfig(RemoteSchemaCacheServiceCacheTest.TestConfig.class)
@DisplayName("P2 白盒 — RemoteSchemaCacheService 缓存")
class RemoteSchemaCacheServiceCacheTest {

    @Autowired
    private RemoteSchemaCacheService cacheService;

    @Autowired
    private CountingRemoteSchemaProvider countingProvider;

    @Autowired
    private CacheManager cacheManager;

    @Test
    @DisplayName("WB-LC-007: 二次 getCachedFormSchema 命中缓存")
    void wbLc007_secondLookupHitsCache() {
        Map<String, Object> first = cacheService.getCachedFormSchema("rewardRules", "PER_APPROVED");
        Map<String, Object> second = cacheService.getCachedFormSchema("rewardRules", "PER_APPROVED");

        assertThat(first).containsEntry("type", "object");
        assertThat(second).isEqualTo(first);
        assertThat(countingProvider.loadCount).isEqualTo(1);
        assertThat(cacheManager.getCache("remoteSchemas")).isNotNull();
    }

    @Configuration
    @EnableCaching
    static class TestConfig {
        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("remoteSchemas");
        }

        @Bean
        CountingRemoteSchemaProvider countingRemoteSchemaProvider() {
            return new CountingRemoteSchemaProvider();
        }

        @Bean
        RemoteSchemaRegistry remoteSchemaRegistry(CountingRemoteSchemaProvider provider) {
            return new RemoteSchemaRegistry(List.of(provider), adminUserProvider());
        }

        @Bean
        RemoteSchemaCacheService remoteSchemaCacheService(RemoteSchemaRegistry registry) {
            return new RemoteSchemaCacheService(registry);
        }

        @Bean
        CurrentUserProvider adminUserProvider() {
            return () -> new AuthenticatedUser(
                    1L, "admin", "admin", Set.of("ADMIN"), Set.of("system:admin"), List.of(), Set.of());
        }
    }

    static final class CountingRemoteSchemaProvider implements RemoteSchemaProvider {
        int loadCount;

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
            return Map.of("type", "object");
        }
    }
}
