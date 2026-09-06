package com.labelhub.infra.business.llm.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.LlmCatalogModelOption;
import com.labelhub.core.business.BusinessDtos.LlmCatalogProviderOption;
import com.labelhub.core.business.BusinessDtos.LlmProviderSummary;
import com.labelhub.core.business.BusinessDtos.RemoteLlmModelOption;
import com.labelhub.core.business.LlmProviderService;
import com.labelhub.infra.business.llm.agent.AgentLlmModelDiscoveryClient;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.LlmProviderQuerySpec;
import com.labelhub.infra.persistence.entity.LlmModelEntity;
import com.labelhub.infra.persistence.entity.LlmProviderEntity;
import com.labelhub.infra.persistence.mapper.LlmModelMapper;
import com.labelhub.infra.persistence.mapper.LlmProviderMapper;
import com.labelhub.infra.security.LlmOutboundUrlValidator;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Base64;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbLlmProviderService implements LlmProviderService {
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 16;
    private static final ResourceQuerySpec<LlmProviderEntity> QUERY_SPEC = LlmProviderQuerySpec.build();

    private final LlmProviderMapper llmProviderMapper;
    private final LlmModelMapper llmModelMapper;
    private final ObjectMapper objectMapper;
    private final MybatisQueryApplier queryApplier;
    private final AgentLlmModelDiscoveryClient modelDiscoveryClient;
    private final LlmOutboundUrlValidator outboundUrlValidator;

    @Value("${labelhub.security.aes-key}")
    private String aesKeyHex;

    public DbLlmProviderService(LlmProviderMapper llmProviderMapper, LlmModelMapper llmModelMapper,
            ObjectMapper objectMapper, MybatisQueryApplier queryApplier,
            AgentLlmModelDiscoveryClient modelDiscoveryClient,
            LlmOutboundUrlValidator outboundUrlValidator) {
        this.llmProviderMapper = llmProviderMapper;
        this.llmModelMapper = llmModelMapper;
        this.objectMapper = objectMapper;
        this.queryApplier = queryApplier;
        this.modelDiscoveryClient = modelDiscoveryClient;
        this.outboundUrlValidator = outboundUrlValidator;
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public PageResponse<LlmProviderSummary> listProviders(ParsedListQuery query) {
        LambdaQueryWrapper<LlmProviderEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LlmProviderEntity::getDeletedFlag, 0);
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.and(w -> w.like(LlmProviderEntity::getProviderName, query.keyword())
                    .or().like(LlmProviderEntity::getProviderCode, query.keyword()));
        }
        queryApplier.apply(wrapper, query, QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(LlmProviderEntity::getCreatedAt);
        }
        IPage<LlmProviderEntity> pageResult = llmProviderMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(this::toSummary).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public LlmProviderSummary getProviderDetail(Long id) {
        LlmProviderEntity e = llmProviderMapper.selectById(id);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.LLM_PROVIDER_NOT_FOUND);
        }
        return toDetailSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "LLM_PROVIDER", actionCode = "llm_provider.create", entityId = "#result.id()", after = com.labelhub.core.audit.AuditSnapshotSource.RESULT)
    public LlmProviderSummary createProvider(String providerName, String providerCode, String baseUrl,
            String apiKey, Map<String, Object> configJson) {
        LlmProviderEntity e = new LlmProviderEntity();
        e.setProviderName(providerName);
        e.setProviderCode(providerCode);
        e.setBaseUrl(outboundUrlValidator.requireSafeBaseUrl(baseUrl));
        if (apiKey != null && !apiKey.isBlank()) {
            e.setApiKeyCiphertext(encryptAesGcm(apiKey));
        }
        e.setStatus("ACTIVE");
        try {
            e.setConfigJson(objectMapper.writeValueAsString(configJson != null ? configJson : Collections.emptyMap()));
        } catch (Exception ex) {
            e.setConfigJson("{}");
        }
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        llmProviderMapper.insert(e);
        return toSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "LLM_PROVIDER", actionCode = "llm_provider.update", entityId = "#id")
    public LlmProviderSummary updateProvider(Long id, String providerName, String baseUrl, String apiKey,
            Map<String, Object> configJson) {
        LlmProviderEntity e = llmProviderMapper.selectById(id);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.LLM_PROVIDER_NOT_FOUND);
        }
        e.setProviderName(providerName);
        e.setBaseUrl(outboundUrlValidator.requireSafeBaseUrl(baseUrl));
        if (apiKey != null && !apiKey.isBlank()) {
            e.setApiKeyCiphertext(encryptAesGcm(apiKey));
        }
        if (configJson != null) {
            try {
                e.setConfigJson(objectMapper.writeValueAsString(configJson));
            } catch (Exception ex) {
            }
        }
        e.setUpdatedAt(Instant.now());
        llmProviderMapper.updateById(e);
        return toSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "LLM_PROVIDER", actionCode = "llm_provider.delete", entityId = "#id")
    public void deleteProvider(Long id) {
        LlmProviderEntity e = llmProviderMapper.selectById(id);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION);
        }
        e.setDeletedFlag(1);
        e.setUpdatedAt(Instant.now());
        llmProviderMapper.updateById(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "LLM_PROVIDER", actionCode = "llm_provider.toggle_status", entityId = "#id")
    public void toggleStatus(Long id, String status) {
        LlmProviderEntity e = llmProviderMapper.selectById(id);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION);
        }
        e.setStatus(status);
        e.setUpdatedAt(Instant.now());
        llmProviderMapper.updateById(e);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read", "business:template:read", "business:template:manage" })
    public List<LlmCatalogProviderOption> listCatalog(String scenario) {
        LambdaQueryWrapper<LlmProviderEntity> providerWrapper = new LambdaQueryWrapper<>();
        providerWrapper.eq(LlmProviderEntity::getDeletedFlag, 0).eq(LlmProviderEntity::getStatus, "ACTIVE");
        providerWrapper.orderByAsc(LlmProviderEntity::getProviderName);
        List<LlmProviderEntity> providers = llmProviderMapper.selectList(providerWrapper);
        if (providers.isEmpty()) {
            return List.of();
        }
        List<Long> providerIds = providers.stream().map(LlmProviderEntity::getId).toList();
        LambdaQueryWrapper<LlmModelEntity> modelWrapper = new LambdaQueryWrapper<>();
        modelWrapper.eq(LlmModelEntity::getDeletedFlag, 0)
                .eq(LlmModelEntity::getStatus, "ACTIVE")
                .in(LlmModelEntity::getProviderId, providerIds);
        if (scenario != null && !scenario.isBlank() && !"ALL".equalsIgnoreCase(scenario)) {
            modelWrapper.and(w -> w.eq(LlmModelEntity::getModelType, scenario.toUpperCase())
                    .or().in(LlmModelEntity::getModelType, List.of("CHAT", "COMPLETION", "REVIEW")));
        }
        modelWrapper.orderByAsc(LlmModelEntity::getModelName);
        List<LlmModelEntity> models = llmModelMapper.selectList(modelWrapper);
        Map<Long, List<LlmModelEntity>> modelsByProvider = models.stream()
                .collect(java.util.stream.Collectors.groupingBy(LlmModelEntity::getProviderId));
        List<LlmCatalogProviderOption> options = new ArrayList<>();
        for (LlmProviderEntity provider : providers) {
            List<LlmCatalogModelOption> modelOptions = modelsByProvider.getOrDefault(provider.getId(), List.of()).stream()
                    .map(model -> new LlmCatalogModelOption(
                            model.getId(),
                            model.getModelCode(),
                            model.getModelName(),
                            model.getModelType(),
                            model.getStatus()))
                    .toList();
            if (modelOptions.isEmpty()) {
                continue;
            }
            options.add(new LlmCatalogProviderOption(
                    provider.getId(),
                    provider.getProviderCode(),
                    provider.getProviderName(),
                    provider.getStatus(),
                    modelOptions));
        }
        return options;
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public List<RemoteLlmModelOption> discoverRemoteModels(Long providerId) {
        LlmProviderEntity provider = llmProviderMapper.selectById(providerId);
        if (provider == null || provider.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.LLM_PROVIDER_NOT_FOUND);
        }
        String apiKey = requireDecryptedApiKey(providerId);
        String baseUrl = outboundUrlValidator.requireSafeBaseUrl(provider.getBaseUrl());
        try {
            List<RemoteLlmModelOption> remote = modelDiscoveryClient.listRemoteModels(
                    baseUrl, apiKey, provider.getProviderCode());
            if (!remote.isEmpty()) {
                return remote;
            }
        } catch (BusinessException ignored) {
            // 远程发现不可用（如火山方舟无 /models 接口）时回退平台已发布目录
        }
        List<RemoteLlmModelOption> local = listPublishedModelsForProvider(providerId);
        if (!local.isEmpty()) {
            return local;
        }
        throw new BusinessException(ErrorCode.LLM_NO_PUBLISHED_MODEL);
    }

    private List<RemoteLlmModelOption> listPublishedModelsForProvider(Long providerId) {
        LambdaQueryWrapper<LlmModelEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LlmModelEntity::getDeletedFlag, 0)
                .eq(LlmModelEntity::getStatus, "ACTIVE")
                .eq(LlmModelEntity::getProviderId, providerId)
                .orderByAsc(LlmModelEntity::getModelName);
        return llmModelMapper.selectList(wrapper).stream()
                .map(model -> new RemoteLlmModelOption(
                        model.getModelCode(),
                        model.getModelName(),
                        model.getModelType()))
                .toList();
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public List<RemoteLlmModelOption> discoverRemoteModels(String baseUrl, String apiKey, String providerCode) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException(ErrorCode.LLM_API_KEY_MISSING);
        }
        String safeBaseUrl = outboundUrlValidator.requireSafeBaseUrl(baseUrl);
        return modelDiscoveryClient.listRemoteModels(safeBaseUrl, apiKey.trim(),
                providerCode == null ? "" : providerCode.trim());
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public String decryptApiKey(Long providerId) {
        LlmProviderEntity e = llmProviderMapper.selectById(providerId);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION);
        }
        if (e.getApiKeyCiphertext() == null || e.getApiKeyCiphertext().isBlank())
            return "";
        return decryptAesGcm(e.getApiKeyCiphertext());
    }

    @Override
    public String requireDecryptedApiKey(Long providerId) {
        LlmProviderEntity e = llmProviderMapper.selectById(providerId);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.LLM_PROVIDER_NOT_FOUND);
        }
        if (e.getApiKeyCiphertext() == null || e.getApiKeyCiphertext().isBlank()) {
            throw new BusinessException(ErrorCode.LLM_API_KEY_MISSING);
        }
        String apiKey = decryptAesGcm(e.getApiKeyCiphertext());
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException(ErrorCode.LLM_API_KEY_INVALID);
        }
        return apiKey.trim();
    }

    private String encryptAesGcm(String plainText) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            SecretKeySpec keySpec = new SecretKeySpec(resolveAesKeyBytes(), "AES");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.LLM_ENCRYPT_FAILED);
        }
    }

    private String decryptAesGcm(String encrypted) {
        try {
            byte[] combined = Base64.getDecoder().decode(encrypted);
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            byte[] cipherText = new byte[combined.length - iv.length];
            System.arraycopy(combined, iv.length, cipherText, 0, cipherText.length);
            SecretKeySpec keySpec = new SecretKeySpec(resolveAesKeyBytes(), "AES");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);
            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.LLM_DECRYPT_FAILED);
        }
    }

    private byte[] resolveAesKeyBytes() {
        String configured = aesKeyHex == null ? "" : aesKeyHex.trim();
        if (configured.isEmpty()) {
            throw new BusinessException(ErrorCode.LLM_ENCRYPTION_KEY_NOT_CONFIGURED);
        }
        if (configured.matches("^[0-9a-fA-F]+$") && configured.length() % 2 == 0) {
            return hexToBytes(configured);
        }
        byte[] raw = configured.getBytes(StandardCharsets.UTF_8);
        if (raw.length == 16 || raw.length == 24 || raw.length == 32) {
            return raw;
        }
        try {
            return MessageDigest.getInstance("SHA-256").digest(raw);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.LLM_ENCRYPT_FAILED);
        }
    }

    private byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4) + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }

    private LlmProviderSummary toSummary(LlmProviderEntity e) {
        return new LlmProviderSummary(
                e.getId(),
                e.getProviderCode() != null ? e.getProviderCode() : "",
                e.getProviderName(),
                e.getBaseUrl() != null ? e.getBaseUrl() : "",
                e.getStatus() != null ? e.getStatus() : "",
                e.getIsSystemProvider() != null ? e.getIsSystemProvider() : 0,
                e.getCreatedAt(),
                null);
    }

    private LlmProviderSummary toDetailSummary(LlmProviderEntity e) {
        String maskedApiKey = null;
        if (e.getApiKeyCiphertext() != null && !e.getApiKeyCiphertext().isBlank()) {
            try {
                maskedApiKey = maskApiKey(decryptAesGcm(e.getApiKeyCiphertext()));
            } catch (BusinessException ex) {
                maskedApiKey = "已配置（无法展示）";
            }
        }
        return new LlmProviderSummary(
                e.getId(),
                e.getProviderCode() != null ? e.getProviderCode() : "",
                e.getProviderName(),
                e.getBaseUrl() != null ? e.getBaseUrl() : "",
                e.getStatus() != null ? e.getStatus() : "",
                e.getIsSystemProvider() != null ? e.getIsSystemProvider() : 0,
                e.getCreatedAt(),
                maskedApiKey);
    }

    private static String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return "";
        }
        String value = apiKey.trim();
        int length = value.length();
        if (length <= 8) {
            return "*".repeat(length);
        }
        int head = 4;
        int tail = 4;
        int maskedLength = Math.max(length - head - tail, 12);
        return value.substring(0, head) + "*".repeat(maskedLength) + value.substring(length - tail);
    }
}
