package com.labelhub.infra.lowcode;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.LowCodeDtos.OptionSourceItem;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class BusinessOptionProviderRegistry {
    private final Map<String, BusinessOptionProvider> options;
    private final CurrentUserProvider currentUserProvider;

    public BusinessOptionProviderRegistry(
            List<BusinessOptionProvider> optionProviders,
            CurrentUserProvider currentUserProvider) {
        this.options = indexOptions(optionProviders);
        this.currentUserProvider = currentUserProvider;
    }

    public List<OptionSourceItem> optionSources() {
        return options.values().stream()
                .filter(this::hasPermission)
                .map(provider -> new OptionSourceItem(provider.optionKey(), provider.optionLabel()))
                .toList();
    }

    public BusinessOptionProvider option(String key) {
        BusinessOptionProvider provider = options.get(key);
        if (provider == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Business option not found: " + key);
        }
        if (!hasPermission(provider)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
        return provider;
    }

    private boolean hasPermission(BusinessOptionProvider provider) {
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

    private Map<String, BusinessOptionProvider> indexOptions(List<BusinessOptionProvider> providers) {
        Map<String, BusinessOptionProvider> result = new LinkedHashMap<>();
        for (BusinessOptionProvider provider : providers) {
            BusinessOptionProvider previous = result.putIfAbsent(provider.optionKey(), provider);
            if (previous != null) {
                throw new IllegalStateException("Duplicate business option provider: " + provider.optionKey());
            }
        }
        return Map.copyOf(result);
    }
}
