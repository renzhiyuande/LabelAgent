package com.labelhub.infra.business.llm.support;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.llm.service.DbLlmProviderService;
import com.labelhub.infra.business.llm.support.LlmSuggestSchemaSupport.ProviderWeight;
import com.labelhub.infra.persistence.entity.LlmModelEntity;
import com.labelhub.infra.persistence.entity.LlmProviderEntity;
import com.labelhub.infra.persistence.mapper.LlmModelMapper;
import com.labelhub.infra.persistence.mapper.LlmProviderMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 多 Provider 路由核心：
 * <ul>
 *   <li>按权重轮询选 Provider</li>
 *   <li>每 Provider 独立断路器（连续失败 → 熔断 → 半开探活 → 恢复）</li>
 *   <li>Provider/Model 缓存（避免每次路由都查 DB）</li>
 *   <li>失败自动 fallback 到下一个可用 Provider</li>
 * </ul>
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LlmRouter {

    private static final Logger log = LoggerFactory.getLogger(LlmRouter.class);

    private final LlmProviderMapper llmProviderMapper;
    private final LlmModelMapper llmModelMapper;
    private final DbLlmProviderService llmProviderService;

    private final int failureThreshold;
    private final long openDurationMs;
    private final int halfOpenMaxCalls;
    private final long cacheTtlSeconds;

    /** 按 providerCode 缓存 Provider 实体 + 解密 key */
    private final ConcurrentHashMap<String, CachedProvider> providerCache = new ConcurrentHashMap<>();
    /** 按 providerId:modelCode 缓存 Model 实体 */
    private final ConcurrentHashMap<String, CachedModel> modelCache = new ConcurrentHashMap<>();

    /** 每 Provider 的断路器状态 */
    private final ConcurrentHashMap<String, CircuitState> circuitStates = new ConcurrentHashMap<>();

    /** 轮询计数器 */
    private final AtomicInteger roundRobinCounter = new AtomicInteger(0);

    public LlmRouter(
            LlmProviderMapper llmProviderMapper,
            LlmModelMapper llmModelMapper,
            DbLlmProviderService llmProviderService,
            @Value("${labelhub.llm.suggest.circuit-breaker.failure-threshold:3}") int failureThreshold,
            @Value("${labelhub.llm.suggest.circuit-breaker.open-duration-ms:30000}") long openDurationMs,
            @Value("${labelhub.llm.suggest.circuit-breaker.half-open-max-calls:1}") int halfOpenMaxCalls,
            @Value("${labelhub.llm.suggest.cache-ttl-seconds:300}") long cacheTtlSeconds) {
        this.llmProviderMapper = llmProviderMapper;
        this.llmModelMapper = llmModelMapper;
        this.llmProviderService = llmProviderService;
        this.failureThreshold = failureThreshold;
        this.openDurationMs = openDurationMs;
        this.halfOpenMaxCalls = halfOpenMaxCalls;
        this.cacheTtlSeconds = cacheTtlSeconds;
    }

    // ========== 对外接口 ==========

    /**
     * 从候选列表中按优先级 + 断路器选一个 Provider。
     * 优先用列表中第一个未熔断的候选；全部熔断时返回 null。
     */
    public ResolvedRoute pick(List<ProviderWeight> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }
        // 过滤出未熔断的候选项
        List<ProviderWeight> available = filterAvailable(candidates);
        if (available.isEmpty()) {
            log.warn("All {} providers are circuit-open, returning null", candidates.size());
            return null;
        }
        // 按候选列表顺序选第一个可用的
        ProviderWeight chosen = priorityPick(candidates, available);
        return resolveRoute(chosen);
    }

    /**
     * 报告一次调用结果，更新断路器状态。
     */
    public void reportResult(String providerCode, boolean success, Throwable error) {
        CircuitState state = circuitStates.computeIfAbsent(providerCode, k -> new CircuitState());
        synchronized (state) {
            if (success) {
                state.consecutiveFailures = 0;
                if (state.status == CircuitStatus.HALF_OPEN) {
                    // 半开成功 → 关闭电路
                    state.status = CircuitStatus.CLOSED;
                    state.consecutiveFailures = 0;
                    log.info("Circuit for provider '{}' recovered, closing circuit", providerCode);
                }
            } else {
                state.consecutiveFailures++;
                state.lastFailureAt = Instant.now();
                if (state.status == CircuitStatus.CLOSED
                        && state.consecutiveFailures >= failureThreshold) {
                    // 连续失败达到阈值 → 打开电路
                    state.status = CircuitStatus.OPEN;
                    state.openedAt = Instant.now();
                    log.warn("Circuit for provider '{}' opened after {} consecutive failures: {}",
                            providerCode, state.consecutiveFailures,
                            error != null ? error.getMessage() : "unknown");
                } else if (state.status == CircuitStatus.HALF_OPEN) {
                    // 半开失败 → 重新打开
                    state.status = CircuitStatus.OPEN;
                    state.openedAt = Instant.now();
                    log.warn("Circuit for provider '{}' half-open probe failed, re-opening", providerCode);
                }
            }
        }
    }

    /**
     * 清空缓存（Provider 更新后调用）。
     */
    public void clearCache() {
        providerCache.clear();
        modelCache.clear();
        log.info("LlmRouter cache cleared");
    }

    // ========== 路由选择 ==========

    private List<ProviderWeight> filterAvailable(List<ProviderWeight> candidates) {
        List<ProviderWeight> available = new ArrayList<>();
        for (ProviderWeight pw : candidates) {
            if (!isCircuitOpen(pw.code())) {
                available.add(pw);
            }
        }
        return available;
    }

    private boolean isCircuitOpen(String providerCode) {
        CircuitState state = circuitStates.get(providerCode);
        if (state == null) {
            return false; // 从未失败过，断路器关闭
        }
        synchronized (state) {
            if (state.status == CircuitStatus.CLOSED) {
                return false;
            }
            if (state.status == CircuitStatus.OPEN) {
                // 检查是否到达半开时间
                if (state.openedAt != null
                        && Instant.now().toEpochMilli() - state.openedAt.toEpochMilli() >= openDurationMs) {
                    // 转为半开，允许探活请求
                    state.status = CircuitStatus.HALF_OPEN;
                    state.halfOpenCallCount = 0;
                    log.info("Circuit for provider '{}' transitioning to HALF_OPEN", providerCode);
                    return false; // 允许通过（探活）
                }
                return true; // 仍处于熔断期
            }
            if (state.status == CircuitStatus.HALF_OPEN) {
                // 半开状态：限制探活并发
                if (state.halfOpenCallCount < halfOpenMaxCalls) {
                    state.halfOpenCallCount++;
                    return false; // 允许探活
                }
                return true; // 探活中，其余请求拒绝
            }
            return false;
        }
    }

    /**
     * 按原始列表顺序选第一个可用的候选。
     * 原始顺序中靠前的优先级更高，只有熔断后才切到下一个。
     */
    private ProviderWeight priorityPick(List<ProviderWeight> all, List<ProviderWeight> available) {
        for (ProviderWeight pw : all) {
            if (containsCode(available, pw.code())) {
                return pw;
            }
        }
        // 兜底
        return available.get(0);
    }

    private static boolean containsCode(List<ProviderWeight> list, String code) {
        for (ProviderWeight pw : list) {
            if (Objects.equals(pw.code(), code)) {
                return true;
            }
        }
        return false;
    }

    // ========== Provider/Model 解析 + 缓存 ==========

    private ResolvedRoute resolveRoute(ProviderWeight chosen) {
        CachedProvider cached = getOrLoadProvider(chosen.code());
        if (cached == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION,
                    "LLM provider not found or inactive: " + chosen.code());
        }
        getOrLoadModel(cached.entity.getId(), chosen.model());
        return new ResolvedRoute(
                chosen.code(),
                chosen.model(),
                cached.entity.getBaseUrl(),
                cached.decryptedApiKey);
    }

    private CachedProvider getOrLoadProvider(String providerCode) {
        CachedProvider cached = providerCache.get(providerCode);
        if (cached != null && !cached.isExpired(cacheTtlSeconds)) {
            return cached;
        }
        // 从 DB 加载
        List<LlmProviderEntity> providers = llmProviderMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<LlmProviderEntity>()
                        .eq(LlmProviderEntity::getDeletedFlag, 0)
                        .eq(LlmProviderEntity::getStatus, "ACTIVE")
                        .eq(LlmProviderEntity::getProviderCode, providerCode));
        if (providers.isEmpty()) {
            providerCache.remove(providerCode);
            return null;
        }
        LlmProviderEntity entity = providers.get(0);
        String decryptedKey;
        try {
            decryptedKey = llmProviderService.requireDecryptedApiKey(entity.getId());
        } catch (Exception ex) {
            log.error("Failed to decrypt API key for provider '{}': {}", providerCode, ex.getMessage());
            return null;
        }
        CachedProvider cp = new CachedProvider(entity, decryptedKey, Instant.now());
        providerCache.put(providerCode, cp);
        return cp;
    }

    private void getOrLoadModel(Long providerId, String modelCode) {
        String cacheKey = providerId + ":" + modelCode;
        CachedModel cached = modelCache.get(cacheKey);
        if (cached != null && !cached.isExpired(cacheTtlSeconds)) {
            return;
        }
        List<LlmModelEntity> models = llmModelMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<LlmModelEntity>()
                        .eq(LlmModelEntity::getDeletedFlag, 0)
                        .eq(LlmModelEntity::getStatus, "ACTIVE")
                        .eq(LlmModelEntity::getProviderId, providerId)
                        .eq(LlmModelEntity::getModelCode, modelCode));
        if (models.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION,
                    "LLM model not found or inactive: " + modelCode + " for provider " + providerId);
        }
        modelCache.put(cacheKey, new CachedModel(models.get(0), Instant.now()));
    }

    // ========== 内部状态类 ==========

    /** 路由结果 */
    public record ResolvedRoute(String providerCode, String modelCode, String baseUrl, String apiKey) {
    }

    private enum CircuitStatus {
        CLOSED,   // 正常工作
        OPEN,     // 熔断中
        HALF_OPEN // 半开探活
    }

    private static class CircuitState {
        CircuitStatus status = CircuitStatus.CLOSED;
        int consecutiveFailures = 0;
        Instant lastFailureAt;
        Instant openedAt;
        int halfOpenCallCount = 0;
    }

    private static class CachedProvider {
        final LlmProviderEntity entity;
        final String decryptedApiKey;
        final Instant loadedAt;

        CachedProvider(LlmProviderEntity entity, String decryptedApiKey, Instant loadedAt) {
            this.entity = entity;
            this.decryptedApiKey = decryptedApiKey;
            this.loadedAt = loadedAt;
        }

        boolean isExpired(long ttlSeconds) {
            return Instant.now().toEpochMilli() - loadedAt.toEpochMilli() > ttlSeconds * 1000L;
        }
    }

    private static class CachedModel {
        final LlmModelEntity entity;
        final Instant loadedAt;

        CachedModel(LlmModelEntity entity, Instant loadedAt) {
            this.entity = entity;
            this.loadedAt = loadedAt;
        }

        boolean isExpired(long ttlSeconds) {
            return Instant.now().toEpochMilli() - loadedAt.toEpochMilli() > ttlSeconds * 1000L;
        }
    }
}
