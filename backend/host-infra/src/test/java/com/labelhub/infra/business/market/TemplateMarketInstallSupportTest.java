package com.labelhub.infra.business.market;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.core.business.BusinessDtos.TemplateMarketInstallResult;
import com.labelhub.infra.business.market.support.TemplateMarketInstallSupport;
import com.labelhub.infra.business.market.support.TemplateMarketInstalledLookup;
import com.labelhub.infra.business.market.support.TemplateMarketInstalledLookup.InstalledTemplateRef;
import com.labelhub.infra.business.market.support.TemplateMarketTemplateCopier;
import com.labelhub.infra.persistence.entity.TemplateMarketEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateMarketMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

class TemplateMarketInstallSupportTest {

    @Test
    void installRetriesWhenTemplateCodeConflicts() {
        TemplateMarketEntity market = market(9L, 100L);
        TemplateVersionEntity sourceVersion = sourceVersion(100L);
        TemplatesMapperStub templatesMapperStub = new TemplatesMapperStub();
        templatesMapperStub.insertBehaviors.add(new DuplicateKeyException("uk_templates_tenant_code"));

        TemplateMarketInstallSupport service = new TemplateMarketInstallSupport(
                proxy(TemplateMarketMapper.class, new TemplateMarketMapperStub(market)),
                proxy(TemplateVersionMapper.class, new TemplateVersionMapperStub(sourceVersion)),
                proxy(TemplatesMapper.class, templatesMapperStub),
                new InstalledLookupStub(null),
                new TemplateCopierStub("MARKET-M9", "MARKET-M9-1"));

        TemplateMarketInstallResult result = service.install(9L);

        assertThat(templatesMapperStub.insertCalls).isEqualTo(2);
        assertThat(templatesMapperStub.insertedCodes).containsExactly("MARKET-M9", "MARKET-M9-1");
        assertThat(result.templateCode()).isEqualTo("MARKET-M9-1");
        assertThat(result.templateId()).isEqualTo(1001L);
    }

    @Test
    void installReturnsExistingTemplateWhenDuplicateMeansAlreadyInstalled() {
        TemplateMarketEntity market = market(9L, 100L);
        TemplateVersionEntity sourceVersion = sourceVersion(100L);
        TemplatesMapperStub templatesMapperStub = new TemplatesMapperStub();
        templatesMapperStub.insertBehaviors.add(new DuplicateKeyException("uk_templates_tenant_source_market"));

        TemplatesEntity installedTemplate = new TemplatesEntity();
        installedTemplate.setId(2001L);
        installedTemplate.setDeletedFlag(0);
        installedTemplate.setCurrentTemplateVersionId(3001L);
        installedTemplate.setTemplateCode("MARKET-M9");
        installedTemplate.setTemplateName("Installed Template");
        templatesMapperStub.selectByIdResults.put(2001L, installedTemplate);

        InstalledTemplateRef installedRef = new InstalledTemplateRef(2001L, 3001L);
        InstalledLookupStub installedLookup = new InstalledLookupStub(installedRef);

        TemplateMarketInstallSupport service = new TemplateMarketInstallSupport(
                proxy(TemplateMarketMapper.class, new TemplateMarketMapperStub(market)),
                proxy(TemplateVersionMapper.class, new TemplateVersionMapperStub(sourceVersion)),
                proxy(TemplatesMapper.class, templatesMapperStub),
                installedLookup,
                new TemplateCopierStub("MARKET-M9"));

        TemplateMarketInstallResult result = service.install(9L);

        assertThat(templatesMapperStub.insertCalls).isEqualTo(1);
        assertThat(installedLookup.findCalls).isEqualTo(2);
        assertThat(result.templateId()).isEqualTo(2001L);
        assertThat(result.templateVersionId()).isEqualTo(3001L);
        assertThat(result.templateName()).isEqualTo("Installed Template");
    }

    @Test
    void installOnlyPersistsSourceMarketIdWithoutLegacyExtJson() {
        TemplateMarketEntity market = market(9L, 100L);
        TemplateVersionEntity sourceVersion = sourceVersion(100L);
        TemplatesMapperStub templatesMapperStub = new TemplatesMapperStub();

        TemplateMarketInstallSupport service = new TemplateMarketInstallSupport(
                proxy(TemplateMarketMapper.class, new TemplateMarketMapperStub(market)),
                proxy(TemplateVersionMapper.class, new TemplateVersionMapperStub(sourceVersion)),
                proxy(TemplatesMapper.class, templatesMapperStub),
                new InstalledLookupStub(null),
                new TemplateCopierStub("MARKET-M9"));

        service.install(9L);

        assertThat(templatesMapperStub.lastInsertedTemplate).isNotNull();
        assertThat(templatesMapperStub.lastInsertedTemplate.getSourceMarketId()).isEqualTo(9L);
        assertThat(templatesMapperStub.lastInsertedTemplate.getExtJson()).isNull();
    }

    private static TemplateMarketEntity market(Long marketId, Long templateVersionId) {
        TemplateMarketEntity market = new TemplateMarketEntity();
        market.setId(marketId);
        market.setDeletedFlag(0);
        market.setAuditStatus("APPROVED");
        market.setStatus("ACTIVE");
        market.setPublishedAt(Instant.parse("2026-06-03T00:00:00Z"));
        market.setTemplateVersionId(templateVersionId);
        market.setTemplateCode("MARKET");
        market.setTemplateName("Market Template");
        market.setTemplateDescription("desc");
        market.setSceneCode("GENERAL");
        market.setSchemaJson("{}");
        return market;
    }

    private static TemplateVersionEntity sourceVersion(Long id) {
        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(id);
        version.setDeletedFlag(0);
        version.setTemplateName("Source Version");
        version.setSchemaJson("{}");
        version.setWidgetCount(1);
        version.setRequiredFieldCount(1);
        return version;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] { type }, handler);
    }

    private static final class TemplateMarketMapperStub implements InvocationHandler {
        private final TemplateMarketEntity market;

        private TemplateMarketMapperStub(TemplateMarketEntity market) {
            this.market = market;
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) {
            return switch (method.getName()) {
                case "selectById" -> market;
                case "updateById" -> 1;
                default -> defaultValue(method.getReturnType());
            };
        }
    }

    private static final class TemplateVersionMapperStub implements InvocationHandler {
        private final TemplateVersionEntity sourceVersion;
        private long nextInsertedId = 3001L;

        private TemplateVersionMapperStub(TemplateVersionEntity sourceVersion) {
            this.sourceVersion = sourceVersion;
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) {
            return switch (method.getName()) {
                case "selectById" -> sourceVersion;
                case "insert" -> {
                    TemplateVersionEntity entity = (TemplateVersionEntity) args[0];
                    entity.setId(nextInsertedId++);
                    yield 1;
                }
                default -> defaultValue(method.getReturnType());
            };
        }
    }

    private static final class TemplatesMapperStub implements InvocationHandler {
        private final Deque<RuntimeException> insertBehaviors = new ArrayDeque<>();
        private final java.util.Map<Long, TemplatesEntity> selectByIdResults = new java.util.HashMap<>();
        private final java.util.List<String> insertedCodes = new java.util.ArrayList<>();
        private int insertCalls;
        private TemplatesEntity lastInsertedTemplate;
        private long nextInsertedId = 1001L;

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) {
            return switch (method.getName()) {
                case "insert" -> {
                    insertCalls++;
                    TemplatesEntity entity = (TemplatesEntity) args[0];
                    lastInsertedTemplate = entity;
                    insertedCodes.add(entity.getTemplateCode());
                    RuntimeException next = insertBehaviors.isEmpty() ? null : insertBehaviors.removeFirst();
                    if (next != null) {
                        throw next;
                    }
                    entity.setId(nextInsertedId++);
                    yield 1;
                }
                case "selectById" -> selectByIdResults.get(args[0]);
                case "updateById" -> 1;
                default -> defaultValue(method.getReturnType());
            };
        }
    }

    private static final class InstalledLookupStub extends TemplateMarketInstalledLookup {
        private final InstalledTemplateRef resultAfterConflict;
        private int findCalls;

        private InstalledLookupStub(InstalledTemplateRef resultAfterConflict) {
            super(proxy(TemplatesMapper.class, (p, m, a) -> defaultValue(m.getReturnType())));
            this.resultAfterConflict = resultAfterConflict;
        }

        @Override
        public InstalledTemplateRef findInstalledRef(Long marketId) {
            findCalls++;
            return findCalls >= 2 ? resultAfterConflict : null;
        }
    }

    private static final class TemplateCopierStub extends TemplateMarketTemplateCopier {
        private final Deque<String> codes = new ArrayDeque<>();

        private TemplateCopierStub(String... codes) {
            super(
                    proxy(TemplatesMapper.class, (p, m, a) -> defaultValue(m.getReturnType())),
                    proxy(com.labelhub.infra.persistence.mapper.TemplateVersionFieldMapper.class,
                            (p, m, a) -> defaultValue(m.getReturnType())),
                    proxy(com.labelhub.infra.persistence.mapper.TemplateReviewDimensionMapper.class,
                            (p, m, a) -> defaultValue(m.getReturnType())));
            for (String code : codes) {
                this.codes.add(code);
            }
        }

        @Override
        public String resolveInstallTemplateCode(String baseCode, Long marketId) {
            return codes.isEmpty() ? baseCode + "-M" + marketId : codes.removeFirst();
        }

        @Override
        public void copyVersionContent(TemplateVersionEntity target, TemplateVersionEntity source,
                TemplateMarketEntity market) {
            target.setSchemaJson("{}");
        }

        @Override
        public void copyTemplateFieldsAndDimensions(Long sourceVersionId, Long targetVersionId) {
            // no-op for unit test
        }
    }

    private static Object defaultValue(Class<?> returnType) {
        if (returnType == boolean.class) {
            return false;
        }
        if (returnType == int.class) {
            return 0;
        }
        if (returnType == long.class) {
            return 0L;
        }
        return null;
    }
}
