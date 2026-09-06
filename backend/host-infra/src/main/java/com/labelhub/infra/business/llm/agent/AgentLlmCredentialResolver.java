package com.labelhub.infra.business.llm.agent;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.infra.business.llm.service.DbLlmProviderService;
import com.labelhub.infra.persistence.entity.LlmProviderEntity;
import com.labelhub.infra.persistence.mapper.LlmProviderMapper;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 按 platformKey（providerCode）解析 LLM 连接凭证，供 PyAgent 预审请求注入。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AgentLlmCredentialResolver {
    private final LlmProviderMapper llmProviderMapper;
    private final DbLlmProviderService llmProviderService;

    public AgentLlmCredentialResolver(
            LlmProviderMapper llmProviderMapper,
            DbLlmProviderService llmProviderService) {
        this.llmProviderMapper = llmProviderMapper;
        this.llmProviderService = llmProviderService;
    }

    public Optional<LlmCredentials> resolve(String platformKey) {
        if (!StringUtils.hasText(platformKey)) {
            return Optional.empty();
        }
        LambdaQueryWrapper<LlmProviderEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LlmProviderEntity::getDeletedFlag, 0)
                .eq(LlmProviderEntity::getStatus, "ACTIVE")
                .eq(LlmProviderEntity::getProviderCode, platformKey.trim());
        LlmProviderEntity provider = llmProviderMapper.selectOne(wrapper);
        if (provider == null) {
            return Optional.empty();
        }
        String baseUrl = provider.getBaseUrl() == null ? "" : provider.getBaseUrl().trim();
        try {
            String apiKey = llmProviderService.requireDecryptedApiKey(provider.getId());
            if (!StringUtils.hasText(baseUrl)) {
                return Optional.empty();
            }
            return Optional.of(new LlmCredentials(baseUrl, apiKey));
        } catch (com.labelhub.core.error.BusinessException ex) {
            return Optional.empty();
        }
    }

    public record LlmCredentials(String baseUrl, String apiKey) {
    }
}
