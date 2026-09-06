package com.labelhub.infra.business.llm.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.infra.persistence.entity.LlmModelEntity;
import com.labelhub.infra.persistence.entity.LlmProviderEntity;
import com.labelhub.infra.persistence.mapper.LlmModelMapper;
import com.labelhub.infra.persistence.mapper.LlmProviderMapper;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LlmModelCostResolver {
    private final LlmProviderMapper llmProviderMapper;
    private final LlmModelMapper llmModelMapper;

    public LlmModelCostResolver(LlmProviderMapper llmProviderMapper, LlmModelMapper llmModelMapper) {
        this.llmProviderMapper = llmProviderMapper;
        this.llmModelMapper = llmModelMapper;
    }

    public BigDecimal estimateCost(
            String platformKey,
            String modelId,
            Integer promptTokens,
            Integer completionTokens) {
        LlmModelEntity model = resolveModel(new HashMap<>(), platformKey, modelId);
        if (model == null) {
            return null;
        }
        return LlmUsageCostEstimator.estimate(
                promptTokens,
                completionTokens,
                model.getCostPer1kInputTokens(),
                model.getCostPer1kOutputTokens());
    }

    public BigDecimal estimateCost(
            Map<String, LlmModelEntity> cache,
            String platformKey,
            String modelId,
            Integer promptTokens,
            Integer completionTokens) {
        LlmModelEntity model = resolveModel(cache, platformKey, modelId);
        if (model == null) {
            return null;
        }
        return LlmUsageCostEstimator.estimate(
                promptTokens,
                completionTokens,
                model.getCostPer1kInputTokens(),
                model.getCostPer1kOutputTokens());
    }

    private LlmModelEntity resolveModel(Map<String, LlmModelEntity> cache, String platformKey, String modelId) {
        if (!StringUtils.hasText(platformKey) || !StringUtils.hasText(modelId)) {
            return null;
        }
        String cacheKey = platformKey.trim() + "::" + modelId.trim();
        if (cache.containsKey(cacheKey)) {
            return cache.get(cacheKey);
        }
        LlmProviderEntity provider = llmProviderMapper.selectOne(new LambdaQueryWrapper<LlmProviderEntity>()
                .eq(LlmProviderEntity::getDeletedFlag, 0)
                .eq(LlmProviderEntity::getProviderCode, platformKey.trim())
                .last("LIMIT 1"));
        if (provider == null) {
            cache.put(cacheKey, null);
            return null;
        }
        List<LlmModelEntity> models = llmModelMapper.selectList(new LambdaQueryWrapper<LlmModelEntity>()
                .eq(LlmModelEntity::getDeletedFlag, 0)
                .eq(LlmModelEntity::getProviderId, provider.getId())
                .eq(LlmModelEntity::getModelCode, modelId.trim())
                .last("LIMIT 1"));
        LlmModelEntity model = models.isEmpty() ? null : models.getFirst();
        cache.put(cacheKey, model);
        return model;
    }
}
