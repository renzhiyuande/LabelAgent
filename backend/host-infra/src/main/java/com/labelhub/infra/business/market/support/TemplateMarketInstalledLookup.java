package com.labelhub.infra.business.market.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TemplateMarketInstalledLookup {
    private final TemplatesMapper templatesMapper;

    public TemplateMarketInstalledLookup(TemplatesMapper templatesMapper) {
        this.templatesMapper = templatesMapper;
    }

    public Map<Long, InstalledTemplateRef> loadInstalledByMarketId() {
        LambdaQueryWrapper<TemplatesEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        wrapper.isNull(TemplatesEntity::getTaskId);
        Map<Long, InstalledTemplateRef> installedByMarketId = new HashMap<>();
        for (TemplatesEntity template : templatesMapper.selectList(wrapper)) {
            putInstalledRef(installedByMarketId, template);
        }
        return installedByMarketId;
    }

    public Map<Long, InstalledTemplateRef> loadInstalledForMarketIds(Collection<Long> marketIds) {
        Map<Long, InstalledTemplateRef> installedByMarketId = new HashMap<>();
        if (marketIds == null || marketIds.isEmpty()) {
            return installedByMarketId;
        }
        Set<Long> uniqueMarketIds = new HashSet<>();
        for (Long marketId : marketIds) {
            if (marketId != null && marketId > 0) {
                uniqueMarketIds.add(marketId);
            }
        }
        if (uniqueMarketIds.isEmpty()) {
            return installedByMarketId;
        }

        LambdaQueryWrapper<TemplatesEntity> indexedWrapper = new LambdaQueryWrapper<>();
        indexedWrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        indexedWrapper.isNull(TemplatesEntity::getTaskId);
        indexedWrapper.in(TemplatesEntity::getSourceMarketId, uniqueMarketIds);
        for (TemplatesEntity template : templatesMapper.selectList(indexedWrapper)) {
            putInstalledRef(installedByMarketId, template);
        }
        return installedByMarketId;
    }

    public InstalledTemplateRef findInstalledRef(Long marketId) {
        if (marketId == null || marketId <= 0) {
            return null;
        }
        return loadInstalledForMarketIds(Set.of(marketId)).get(marketId);
    }

    private void putInstalledRef(Map<Long, InstalledTemplateRef> installedByMarketId, TemplatesEntity template) {
        Long marketId = template.getSourceMarketId();
        if (marketId == null || marketId <= 0) {
            return;
        }
        InstalledTemplateRef existing = installedByMarketId.get(marketId);
        if (existing == null || template.getId() < existing.templateId()) {
            installedByMarketId.put(
                    marketId,
                    new InstalledTemplateRef(template.getId(), template.getCurrentTemplateVersionId()));
        }
    }

    public record InstalledTemplateRef(Long templateId, Long templateVersionId) {
    }
}
