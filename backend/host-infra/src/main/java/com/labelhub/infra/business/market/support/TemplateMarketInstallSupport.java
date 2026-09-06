package com.labelhub.infra.business.market.support;

import com.labelhub.core.business.BusinessDtos.TemplateMarketInstallResult;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.market.support.TemplateMarketInstalledLookup.InstalledTemplateRef;
import com.labelhub.infra.persistence.entity.TemplateMarketEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateMarketMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TemplateMarketInstallSupport {
    private static final String AUDIT_APPROVED = "APPROVED";
    private static final String MARKET_ACTIVE = "ACTIVE";
    private static final int MAX_TEMPLATE_INSERT_ATTEMPTS = 5;

    private final TemplateMarketMapper marketMapper;
    private final TemplateVersionMapper versionMapper;
    private final TemplatesMapper templatesMapper;
    private final TemplateMarketInstalledLookup installedLookup;
    private final TemplateMarketTemplateCopier templateCopier;

    public TemplateMarketInstallSupport(
            TemplateMarketMapper marketMapper,
            TemplateVersionMapper versionMapper,
            TemplatesMapper templatesMapper,
            TemplateMarketInstalledLookup installedLookup,
            TemplateMarketTemplateCopier templateCopier) {
        this.marketMapper = marketMapper;
        this.versionMapper = versionMapper;
        this.templatesMapper = templatesMapper;
        this.installedLookup = installedLookup;
        this.templateCopier = templateCopier;
    }

    public TemplateMarketInstallResult install(Long marketId) {
        TemplateMarketEntity market = requireInstallableMarket(marketId);
        InstalledTemplateRef existing = installedLookup.findInstalledRef(marketId);
        if (existing != null) {
            return toInstallResult(existing);
        }
        TemplateVersionEntity sourceVersion = requireSourceVersion(market);
        Instant now = Instant.now();

        TemplatesEntity template = newTemplateShell(market, marketId, now);
        InstalledTemplateRef insertConflict = insertTemplateWithRetry(market, marketId, template);
        if (insertConflict != null) {
            return toInstallResult(insertConflict);
        }

        TemplateVersionEntity installedVersion = new TemplateVersionEntity();
        installedVersion.setTemplateId(template.getId());
        installedVersion.setTaskId(null);
        installedVersion.setVersionNo(1);
        installedVersion.setTemplateName(template.getTemplateName());
        installedVersion.setStatus("DRAFT");
        installedVersion.setIsCurrent(1);
        templateCopier.copyVersionContent(installedVersion, sourceVersion, market);
        installedVersion.setWidgetCount(sourceVersion.getWidgetCount() != null ? sourceVersion.getWidgetCount() : 0);
        installedVersion.setRequiredFieldCount(
                sourceVersion.getRequiredFieldCount() != null ? sourceVersion.getRequiredFieldCount() : 0);
        installedVersion.setCreatedAt(now);
        installedVersion.setUpdatedAt(now);
        versionMapper.insert(installedVersion);

        templateCopier.copyTemplateFieldsAndDimensions(sourceVersion.getId(), installedVersion.getId());

        template.setCurrentTemplateVersionId(installedVersion.getId());
        template.setUpdatedAt(now);
        templatesMapper.updateById(template);

        market.setDownloadCount((market.getDownloadCount() != null ? market.getDownloadCount() : 0) + 1);
        market.setUpdatedAt(now);
        marketMapper.updateById(market);

        return new TemplateMarketInstallResult(
                template.getId(),
                installedVersion.getId(),
                template.getTemplateCode(),
                template.getTemplateName());
    }

    private TemplateMarketInstallResult toInstallResult(InstalledTemplateRef installed) {
        TemplatesEntity template = templatesMapper.selectById(installed.templateId());
        if (template == null || template.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.MKT_ALREADY_INSTALLED);
        }
        return new TemplateMarketInstallResult(
                template.getId(),
                installed.templateVersionId() != null
                        ? installed.templateVersionId()
                        : template.getCurrentTemplateVersionId(),
                template.getTemplateCode(),
                template.getTemplateName());
    }

    private TemplatesEntity newTemplateShell(TemplateMarketEntity market, Long marketId, Instant now) {
        TemplatesEntity template = new TemplatesEntity();
        template.setTaskId(null);
        template.setSourceMarketId(marketId);
        template.setTemplateName(market.getTemplateName());
        template.setSceneCode(market.getSceneCode() != null ? market.getSceneCode() : "GENERAL");
        template.setDescriptionText(market.getTemplateDescription());
        template.setLatestVersionNo(1);
        template.setStatus("DRAFT");
        template.setCreatedAt(now);
        template.setUpdatedAt(now);
        return template;
    }

    private InstalledTemplateRef insertTemplateWithRetry(
            TemplateMarketEntity market, Long marketId, TemplatesEntity template) {
        for (int attempt = 0; attempt < MAX_TEMPLATE_INSERT_ATTEMPTS; attempt++) {
            template.setTemplateCode(templateCopier.resolveInstallTemplateCode(market.getTemplateCode(), marketId));
            try {
                templatesMapper.insert(template);
                return null;
            } catch (DuplicateKeyException ex) {
                InstalledTemplateRef conflict = installedLookup.findInstalledRef(marketId);
                if (conflict != null) {
                    return conflict;
                }
            }
        }
        throw new BusinessException(ErrorCode.MKT_INSTALL_CODE_CONFLICT);
    }

    private TemplateMarketEntity requireInstallableMarket(Long marketId) {
        TemplateMarketEntity market = marketMapper.selectById(marketId);
        if (market == null || market.getDeletedFlag() == 1
                || !AUDIT_APPROVED.equals(market.getAuditStatus())
                || !MARKET_ACTIVE.equals(market.getStatus())
                || market.getPublishedAt() == null) {
            throw new BusinessException(ErrorCode.MKT_TEMPLATE_NOT_FOUND);
        }
        return market;
    }

    private TemplateVersionEntity requireSourceVersion(TemplateMarketEntity market) {
        if (market.getTemplateVersionId() == null) {
            throw new BusinessException(ErrorCode.MKT_NO_SOURCE_VERSION);
        }
        TemplateVersionEntity source = versionMapper.selectById(market.getTemplateVersionId());
        if (source == null || source.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.MKT_SOURCE_VERSION_NOT_FOUND);
        }
        return source;
    }
}
