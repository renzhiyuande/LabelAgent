package com.labelhub.infra.business.market.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.core.business.BusinessDtos.TemplateMarketInstallResult;
import com.labelhub.infra.persistence.entity.TemplateMarketEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateMarketMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — TemplateMarketInstallSupport")
class TemplateMarketInstallSupportWhiteBoxTest {

    @Mock
    private TemplateMarketMapper marketMapper;
    @Mock
    private TemplateVersionMapper versionMapper;
    @Mock
    private TemplatesMapper templatesMapper;
    @Mock
    private TemplateMarketInstalledLookup installedLookup;
    @Mock
    private TemplateMarketTemplateCopier templateCopier;

    private TemplateMarketInstallSupport support;

    @BeforeEach
    void setUp() {
        support = new TemplateMarketInstallSupport(
                marketMapper, versionMapper, templatesMapper, installedLookup, templateCopier);
    }

    @Test
    @DisplayName("WB-TPL-005: install 从市场复制模板与版本内容")
    void wbTpl005_installFromMarketCreatesLocalTemplateCopy() {
        TemplateMarketEntity market = installableMarket(60001L, 13020L);
        TemplateVersionEntity sourceVersion = sourceVersion(13020L);
        when(marketMapper.selectById(60001L)).thenReturn(market);
        when(installedLookup.findInstalledRef(60001L)).thenReturn(null);
        when(versionMapper.selectById(13020L)).thenReturn(sourceVersion);
        when(templateCopier.resolveInstallTemplateCode("MKT_TPL", 60001L)).thenReturn("MKT_TPL_INST_60001");
        doAnswer(invocation -> {
            TemplatesEntity template = invocation.getArgument(0);
            template.setId(12020L);
            return 1;
        }).when(templatesMapper).insert(any(TemplatesEntity.class));
        doAnswer(invocation -> {
            TemplateVersionEntity version = invocation.getArgument(0);
            version.setId(13021L);
            return 1;
        }).when(versionMapper).insert(any(TemplateVersionEntity.class));

        TemplateMarketInstallResult result = support.install(60001L);

        assertThat(result.templateId()).isEqualTo(12020L);
        assertThat(result.templateCode()).isEqualTo("MKT_TPL_INST_60001");

        ArgumentCaptor<TemplateVersionEntity> versionCaptor = ArgumentCaptor.forClass(TemplateVersionEntity.class);
        verify(versionMapper).insert(versionCaptor.capture());
        TemplateVersionEntity installedVersion = versionCaptor.getValue();
        assertThat(installedVersion.getTemplateId()).isEqualTo(12020L);
        assertThat(installedVersion.getStatus()).isEqualTo("DRAFT");
        assertThat(installedVersion.getIsCurrent()).isEqualTo(1);

        verify(templateCopier).copyVersionContent(any(TemplateVersionEntity.class), any(TemplateVersionEntity.class), any());
        verify(templateCopier).copyTemplateFieldsAndDimensions(13020L, 13021L);
        verify(marketMapper).updateById(any(TemplateMarketEntity.class));
    }

    private static TemplateMarketEntity installableMarket(long marketId, long versionId) {
        TemplateMarketEntity market = new TemplateMarketEntity();
        market.setId(marketId);
        market.setTemplateVersionId(versionId);
        market.setTemplateCode("MKT_TPL");
        market.setTemplateName("Market Template");
        market.setTemplateDescription("from market");
        market.setSceneCode("GENERAL");
        market.setAuditStatus("APPROVED");
        market.setStatus("ACTIVE");
        market.setPublishedAt(Instant.now());
        market.setDownloadCount(0);
        market.setDeletedFlag(0);
        return market;
    }

    private static TemplateVersionEntity sourceVersion(long versionId) {
        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(versionId);
        version.setTemplateId(12001L);
        version.setVersionNo(1);
        version.setTemplateName("Market v1");
        version.setStatus("PUBLISHED");
        version.setSchemaJson("{\"sections\":[]}");
        version.setWidgetCount(1);
        version.setRequiredFieldCount(1);
        version.setDeletedFlag(0);
        return version;
    }
}
