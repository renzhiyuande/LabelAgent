package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.LlmCatalogProviderOption;
import com.labelhub.core.business.BusinessDtos.LlmProviderSummary;
import com.labelhub.core.business.BusinessDtos.RemoteLlmModelOption;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import java.util.List;
import java.util.Map;

public interface LlmProviderService {
    PageResponse<LlmProviderSummary> listProviders(ParsedListQuery query);

    LlmProviderSummary getProviderDetail(Long id);

    LlmProviderSummary createProvider(String providerName, String providerCode, String baseUrl, String apiKey,
            Map<String, Object> configJson);

    LlmProviderSummary updateProvider(Long id, String providerName, String baseUrl, String apiKey,
            Map<String, Object> configJson);

    void deleteProvider(Long id);

    void toggleStatus(Long id, String status);

    String decryptApiKey(Long providerId);

    /** 解密 API Key；未配置或为空时抛出业务异常（调用 Agent 前必须使用）。 */
    String requireDecryptedApiKey(Long providerId);

    List<LlmCatalogProviderOption> listCatalog(String scenario);

    List<RemoteLlmModelOption> discoverRemoteModels(Long providerId);

    List<RemoteLlmModelOption> discoverRemoteModels(String baseUrl, String apiKey, String providerCode);
}
