package com.labelhub.infra.business.market.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.TemplateMarketInstallResult;
import com.labelhub.core.business.BusinessDtos.TemplateMarketSummary;
import com.labelhub.core.business.TemplateMarketService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.business.market.support.TemplateMarketInstallSupport;
import com.labelhub.infra.business.market.support.TemplateMarketInstalledLookup;
import com.labelhub.infra.business.market.support.TemplateMarketInstalledLookup.InstalledTemplateRef;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.persistence.entity.TemplateMarketEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateMarketMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbTemplateMarketService implements TemplateMarketService {
    private final TemplateMarketMapper marketMapper;
    private final TemplateVersionMapper versionMapper;
    private final TemplatesMapper templatesMapper;
    private final CurrentUserProvider currentUserProvider;
    private final MybatisQueryApplier queryApplier;
    private final TemplateMarketInstalledLookup installedLookup;
    private final TemplateMarketInstallSupport installSupport;

    private static final String AUDIT_PENDING = "PENDING";
    private static final String AUDIT_APPROVED = "APPROVED";
    private static final String AUDIT_REJECTED = "REJECTED";
    private static final String MARKET_ACTIVE = "ACTIVE";
    private static final String MARKET_OFFLINE = "OFFLINE";

    public DbTemplateMarketService(
            TemplateMarketMapper marketMapper,
            TemplateVersionMapper versionMapper,
            TemplatesMapper templatesMapper,
            CurrentUserProvider currentUserProvider,
            MybatisQueryApplier queryApplier,
            TemplateMarketInstalledLookup installedLookup,
            TemplateMarketInstallSupport installSupport) {
        this.marketMapper = marketMapper;
        this.versionMapper = versionMapper;
        this.templatesMapper = templatesMapper;
        this.currentUserProvider = currentUserProvider;
        this.queryApplier = queryApplier;
        this.installedLookup = installedLookup;
        this.installSupport = installSupport;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public PageResponse<TemplateMarketSummary> listMarketTemplates(ParsedListQuery query) {
        LambdaQueryWrapper<TemplateMarketEntity> wrapper = baseMarketListWrapper(query);
        wrapper.eq(TemplateMarketEntity::getAuditStatus, AUDIT_APPROVED);
        wrapper.eq(TemplateMarketEntity::getStatus, MARKET_ACTIVE);
        wrapper.isNotNull(TemplateMarketEntity::getPublishedAt);
        IPage<TemplateMarketEntity> pageResult = marketMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        Map<Long, InstalledTemplateRef> installedByMarketId = loadInstalledForPage(pageResult.getRecords());
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(entity -> toSummary(entity, installedByMarketId)).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read", "template:market:audit" })
    public PageResponse<TemplateMarketSummary> listMarketTemplatesForAdmin(ParsedListQuery query) {
        LambdaQueryWrapper<TemplateMarketEntity> wrapper = baseMarketListWrapper(query);
        IPage<TemplateMarketEntity> pageResult = marketMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        Map<Long, InstalledTemplateRef> installedByMarketId = loadInstalledForPage(pageResult.getRecords());
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(entity -> toSummary(entity, installedByMarketId)).toList());
    }

    private LambdaQueryWrapper<TemplateMarketEntity> baseMarketListWrapper(ParsedListQuery query) {
        LambdaQueryWrapper<TemplateMarketEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateMarketEntity::getDeletedFlag, 0);
        queryApplier.apply(wrapper, query, ResourceQuerySpec.<TemplateMarketEntity>builder()
                .stringFilter("auditStatus", TemplateMarketEntity::getAuditStatus)
                .stringFilter("marketStatus", TemplateMarketEntity::getStatus)
                .stringFilter("categoryCode", TemplateMarketEntity::getCategoryCode)
                .instantFilter("createdAt", TemplateMarketEntity::getCreatedAt)
                .sortField("templateName", TemplateMarketEntity::getTemplateName)
                .sortField("downloadCount", TemplateMarketEntity::getDownloadCount)
                .sortField("createdAt", TemplateMarketEntity::getCreatedAt)
                .build());
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(TemplateMarketEntity::getDownloadCount).orderByDesc(TemplateMarketEntity::getCreatedAt);
        }
        return wrapper;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public TemplateMarketSummary getMarketDetail(Long id) {
        TemplateMarketEntity e = marketMapper.selectById(id);
        if (e == null || e.getDeletedFlag() == 1
                || !AUDIT_APPROVED.equals(e.getAuditStatus())
                || !MARKET_ACTIVE.equals(e.getStatus())
                || e.getPublishedAt() == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Market template not found");
        }
        return toSummary(e, installedLookup.loadInstalledForMarketIds(List.of(id)));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read", "template:market:audit" })
    public TemplateMarketSummary getMarketDetailForAdmin(Long id) {
        TemplateMarketEntity e = marketMapper.selectById(id);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Market template not found");
        }
        return toSummary(e, installedLookup.loadInstalledForMarketIds(List.of(id)));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:publish" })
    @Audit(entityType = "TEMPLATE_MARKET", actionCode = "market.submit", entityId = "#result.id()", after = com.labelhub.core.audit.AuditSnapshotSource.RESULT)
    public TemplateMarketSummary submitForReview(Long templateVersionId, String description) {
        TemplateVersionEntity version = versionMapper.selectById(templateVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!"PUBLISHED".equals(version.getStatus())) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID,
                    "Only published version can be submitted to market");
        }
        TemplatesEntity template = requireTemplate(version.getTemplateId());
        String templateDescription = description != null && !description.isBlank()
                ? description.trim()
                : template.getDescriptionText();
        Instant now = Instant.now();

        LambdaQueryWrapper<TemplateMarketEntity> existingWrapper = new LambdaQueryWrapper<>();
        existingWrapper.eq(TemplateMarketEntity::getDeletedFlag, 0);
        existingWrapper.and(wrapper -> wrapper
                .eq(TemplateMarketEntity::getTemplateVersionId, templateVersionId)
                .or()
                .eq(TemplateMarketEntity::getTemplateCode, template.getTemplateCode()));
        TemplateMarketEntity existing = marketMapper.selectOne(existingWrapper);
        if (existing != null) {
            applyTemplateSnapshot(existing, template, version, templateDescription, now);
            existing.setAuditStatus(AUDIT_PENDING);
            existing.setStatus(MARKET_OFFLINE);
            existing.setPublishedAt(null);
            existing.setUpdatedAt(now);
            marketMapper.updateById(existing);
            return toSummary(existing);
        }

        TemplateMarketEntity e = new TemplateMarketEntity();
        applyTemplateSnapshot(e, template, version, templateDescription, now);
        e.setAuditStatus(AUDIT_PENDING);
        e.setStatus(MARKET_OFFLINE);
        e.setIsPublic(1);
        e.setIsFeatured(0);
        e.setDownloadCount(0);
        e.setLikeCount(0);
        e.setViewCount(0);
        e.setFavoriteCount(0);
        e.setRatingCount(0);
        e.setRatingAvg(BigDecimal.ZERO);
        e.setCreatedAt(now);
        e.setUpdatedAt(now);
        marketMapper.insert(e);
        return toSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "TEMPLATE_MARKET", actionCode = "market.approve", entityId = "#marketId")
    public TemplateMarketSummary approve(Long marketId, String reviewComment) {
        TemplateMarketEntity e = marketMapper.selectById(marketId);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION);
        }
        e.setAuditStatus(AUDIT_APPROVED);
        e.setUpdatedAt(Instant.now());
        marketMapper.updateById(e);
        return toSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "TEMPLATE_MARKET", actionCode = "market.reject", entityId = "#marketId")
    public TemplateMarketSummary reject(Long marketId, String reviewComment) {
        TemplateMarketEntity e = marketMapper.selectById(marketId);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION);
        }
        e.setAuditStatus(AUDIT_REJECTED);
        e.setUpdatedAt(Instant.now());
        marketMapper.updateById(e);
        return toSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "TEMPLATE_MARKET", actionCode = "market.publish", entityId = "#marketId")
    public TemplateMarketSummary publish(Long marketId) {
        TemplateMarketEntity e = marketMapper.selectById(marketId);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION);
        }
        if (!AUDIT_APPROVED.equals(e.getAuditStatus())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Only approved market entry can be published");
        }
        e.setStatus(MARKET_ACTIVE);
        e.setPublishedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        marketMapper.updateById(e);
        return toSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "TEMPLATE_MARKET", actionCode = "market.offline", entityId = "#marketId")
    public TemplateMarketSummary offline(Long marketId, String reason) {
        TemplateMarketEntity e = marketMapper.selectById(marketId);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION);
        }
        e.setStatus(MARKET_OFFLINE);
        e.setUpdatedAt(Instant.now());
        marketMapper.updateById(e);
        return toSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    @Audit(entityType = "TEMPLATE_MARKET", actionCode = "market.install", entityId = "#marketId")
    public TemplateMarketInstallResult installFromMarket(Long marketId) {
        return installSupport.install(marketId);
    }

    private Map<Long, InstalledTemplateRef> loadInstalledForPage(List<TemplateMarketEntity> records) {
        List<Long> marketIds = records.stream().map(TemplateMarketEntity::getId).toList();
        return installedLookup.loadInstalledForMarketIds(marketIds);
    }

    private TemplateMarketSummary toSummary(TemplateMarketEntity e) {
        return toSummary(e, installedLookup.loadInstalledForMarketIds(List.of(e.getId())));
    }

    private TemplateMarketSummary toSummary(TemplateMarketEntity e, Map<Long, InstalledTemplateRef> installedByMarketId) {
        InstalledTemplateRef installed = installedByMarketId.get(e.getId());
        return new TemplateMarketSummary(
                e.getId(),
                e.getTemplateCode() != null ? e.getTemplateCode() : "",
                e.getTemplateName(),
                e.getTemplateDescription() != null ? e.getTemplateDescription() : "",
                e.getSceneCode() != null ? e.getSceneCode() : "",
                e.getDownloadCount() != null ? e.getDownloadCount() : 0,
                e.getFavoriteCount() != null ? e.getFavoriteCount() : 0,
                e.getRatingAvg() != null ? e.getRatingAvg() : BigDecimal.ZERO,
                e.getIsFeatured() != null ? e.getIsFeatured() : 0,
                e.getAuditStatus() != null ? e.getAuditStatus() : "",
                e.getStatus() != null ? e.getStatus() : "",
                e.getPublishedAt() != null ? e.getPublishedAt() : e.getCreatedAt(),
                installed != null,
                installed != null ? installed.templateId() : null,
                installed != null ? installed.templateVersionId() : null);
    }

    private TemplatesEntity requireTemplate(Long templateId) {
        if (templateId == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Template version is not bound to template");
        }
        TemplatesEntity template = templatesMapper.selectById(templateId);
        if (template == null || template.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Template not found");
        }
        return template;
    }

    private void applyTemplateSnapshot(
            TemplateMarketEntity entity,
            TemplatesEntity template,
            TemplateVersionEntity version,
            String templateDescription,
            Instant now) {
        entity.setTemplateVersionId(version.getId());
        entity.setTemplateCode(template.getTemplateCode());
        entity.setTemplateName(template.getTemplateName());
        entity.setTemplateDescription(templateDescription);
        entity.setCategoryCode(template.getSceneCode());
        entity.setSceneCode(template.getSceneCode());
        entity.setAuthorId(resolveAuthorId(version));
        entity.setSourceTenantId(version.getTenantId() != null ? version.getTenantId() : 1L);
        entity.setSourceTaskId(version.getTaskId());
        entity.setSchemaJson(version.getSchemaJson());
        entity.setReviewPromptTemplate(version.getReviewPromptTemplate());
        entity.setReviewOutputSchemaJson(version.getReviewOutputSchemaJson());
        entity.setReviewWorkflowJson(version.getReviewWorkflowJson());
        entity.setAcceptanceRuleJson(version.getAcceptanceRuleJson());
        entity.setLlmAssistConfigJson(version.getLlmAssistConfigJson());
        entity.setUpdatedAt(now);
    }

    private Long resolveAuthorId(TemplateVersionEntity version) {
        try {
            Long userId = currentUserProvider.currentUser().userId();
            if (userId != null && userId > 0) {
                return userId;
            }
        } catch (Exception ignored) {
        }
        if (version.getCreatedBy() != null && version.getCreatedBy() > 0) {
            return version.getCreatedBy();
        }
        return 0L;
    }
}
