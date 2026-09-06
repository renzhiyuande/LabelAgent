package com.labelhub.infra.lowcode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.LowCodeDtos.FilterRule;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.LowCodeDtos.SortRule;
import com.labelhub.core.lowcode.query.FilterOperator;
import com.labelhub.core.lowcode.query.ListQueryParser;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("P2 白盒 — 低代码引擎")
class LowCodeWhiteBoxTest {

    private final ListQueryParser parser = new ListQueryParser();

    @Test
    @DisplayName("WB-LC-001: requireProvider 返回已注册资源 Provider")
    void wbLc001_registeredResourceProviderIsReturned() {
        StubResourceProvider provider = new StubResourceProvider("tasks", "任务");
        LowCodeProviderRegistry registry = new LowCodeProviderRegistry(
                List.of(provider),
                List.of(),
                userProvider(adminUser()));

        LowCodeResourceProvider<?> resolved = registry.resource("tasks");

        assertThat(resolved).isSameAs(provider);
        assertThat(resolved.resourceKey()).isEqualTo("tasks");
    }

    @Test
    @DisplayName("WB-LC-002: 未注册 key 抛 RESOURCE_NOT_FOUND")
    void wbLc002_unknownResourceKeyIsRejected() {
        LowCodeProviderRegistry registry = new LowCodeProviderRegistry(List.of(), List.of(), userProvider(adminUser()));

        assertThatThrownBy(() -> registry.resource("unknown-resource"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).errorCode())
                        .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    @DisplayName("WB-LC-003: ListQueryParser 解析复杂 filter/sort/page")
    void wbLc003_parseComplexListQuery() {
        ParsedListQuery parsed = parser.parse(new ListQuery(
                2,
                20,
                List.of(new SortRule("createdAt", "desc"), new SortRule("id", "asc")),
                List.of(
                        new FilterRule("keyword", "like", " mixed "),
                        new FilterRule("status", "eq", "ACTIVE"),
                        new FilterRule("occurredAt", "between", List.of("2026-01-01", "2026-01-31")),
                        new FilterRule("ids", "in", List.of(1, 2, 3)))));

        assertThat(parsed.page()).isEqualTo(2);
        assertThat(parsed.pageSize()).isEqualTo(20);
        assertThat(parsed.keyword()).isEqualTo("mixed");
        assertThat(parsed.sort()).hasSize(2);
        assertThat(parsed.filters()).hasSize(3);
        assertThat(parsed.filters().get(0).operator()).isEqualTo(FilterOperator.EQ);
        assertThat(parsed.filters().get(1).operator()).isEqualTo(FilterOperator.BETWEEN);
        assertThat(parsed.filters().get(2).operator()).isEqualTo(FilterOperator.IN);
    }

    @Test
    @DisplayName("WB-LC-004: 非法 filter op 拒绝解析")
    void wbLc004_invalidFilterOperatorIsRejected() {
        assertThatThrownBy(() -> parser.parse(new ListQuery(
                        1,
                        10,
                        List.of(),
                        List.of(new FilterRule("status", "contains", "ACTIVE")))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unsupported filter op");
    }

    private static CurrentUserProvider userProvider(AuthenticatedUser user) {
        return () -> user;
    }

    private static AuthenticatedUser adminUser() {
        return new AuthenticatedUser(
                1L, "admin", "admin", Set.of("ADMIN"), Set.of("system:admin"), List.of(), Set.of());
    }

    private static final class StubResourceProvider implements LowCodeResourceProvider<Object> {
        private final String key;
        private final String label;

        private StubResourceProvider(String key, String label) {
            this.key = key;
            this.label = label;
        }

        @Override
        public String resourceKey() {
            return key;
        }

        @Override
        public String label() {
            return label;
        }

        @Override
        public Class<Object> summaryType() {
            return Object.class;
        }

        @Override
        public PageResponse<Object> query(ListQuery query) {
            return PageResponse.empty();
        }
    }
}
