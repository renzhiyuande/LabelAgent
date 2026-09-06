package com.labelhub.infra.lowcode;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.LowCodeDtos.OptionSourceItem;
import com.labelhub.core.lowcode.LowCodeDtos.ResourceRegistryItem;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LowCodeProviderRegistry {
    private final Map<String, LowCodeResourceProvider<?>> resources;
    private final Map<String, LowCodeOptionProvider> options;
    private final CurrentUserProvider currentUserProvider;

    public LowCodeProviderRegistry(
            List<LowCodeResourceProvider<?>> resourceProviders,
            List<LowCodeOptionProvider> optionProviders,
            CurrentUserProvider currentUserProvider) {
        this.resources = indexResources(resourceProviders);
        this.options = indexOptions(optionProviders);
        this.currentUserProvider = currentUserProvider;
    }

    public List<ResourceRegistryItem> resources() {
        return resources.values().stream().map(LowCodeResourceProvider::resourceItem).toList();
    }

    public LowCodeResourceProvider<?> resource(String key) {
        LowCodeResourceProvider<?> provider = resources.get(key);
        if (provider == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Low-code resource not found: " + key);
        }
        return provider;
    }

    public LowCodeOptionProvider option(String key) {
        LowCodeOptionProvider provider = options.get(key);
        if (provider == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "option not found");
        }
        if (!hasPermission(provider)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
        return provider;
    }

    /** 返回当前用户有权访问的系统 low-code option 数据源（供系统管理页使用，非模板标注）。 */
    public List<OptionSourceItem> optionSources() {
        return options.values().stream()
                .filter(this::hasPermission)
                .map(p -> new OptionSourceItem(p.optionKey(), p.optionLabel()))
                .toList();
    }

    private boolean hasPermission(LowCodeOptionProvider provider) {
        String[] required = provider.requiredPermissions();
        if (required == null || required.length == 0) {
            return true;
        }
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (user == null || user.permissions() == null || user.permissions().isEmpty()) {
            return false;
        }
        for (String permission : required) {
            if (permission != null && !permission.isBlank() && user.permissions().contains(permission)) {
                return true;
            }
        }
        return false;
    }

    private Map<String, LowCodeResourceProvider<?>> indexResources(List<LowCodeResourceProvider<?>> providers) {
        Map<String, LowCodeResourceProvider<?>> result = new LinkedHashMap<>();
        for (LowCodeResourceProvider<?> provider : providers) {
            LowCodeResourceProvider<?> previous = result.putIfAbsent(provider.resourceKey(), provider);
            if (previous != null) {
                throw new IllegalStateException("Duplicate lowcode resource provider: " + provider.resourceKey());
            }
        }
        return Map.copyOf(result);
    }

    private Map<String, LowCodeOptionProvider> indexOptions(List<LowCodeOptionProvider> providers) {
        Map<String, LowCodeOptionProvider> result = new LinkedHashMap<>();
        for (LowCodeOptionProvider provider : providers) {
            LowCodeOptionProvider previous = result.putIfAbsent(provider.optionKey(), provider);
            if (previous != null) {
                throw new IllegalStateException("Duplicate lowcode option provider: " + provider.optionKey());
            }
        }
        return Map.copyOf(result);
    }
}
