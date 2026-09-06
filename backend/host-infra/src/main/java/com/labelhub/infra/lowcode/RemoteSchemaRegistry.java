package com.labelhub.infra.lowcode;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

@Component
public class RemoteSchemaRegistry {
    private final Map<String, Map<String, RemoteSchemaProvider>> providersByNamespace;
    private final CurrentUserProvider currentUserProvider;

    public RemoteSchemaRegistry(List<RemoteSchemaProvider> providers, CurrentUserProvider currentUserProvider) {
        this.providersByNamespace = providers.stream()
                .collect(Collectors.groupingBy(
                        RemoteSchemaProvider::namespace,
                        Collectors.toUnmodifiableMap(RemoteSchemaProvider::key, provider -> provider)));
        this.currentUserProvider = currentUserProvider;
    }

    public List<RemoteSchemaProvider> listByNamespace(String namespace) {
        return providersByNamespace
                .getOrDefault(namespace, Map.of())
                .values()
                .stream()
                .filter(this::hasPermission)
                .sorted(Comparator.comparing(RemoteSchemaProvider::label)
                        .thenComparing(RemoteSchemaProvider::key))
                .toList();
    }

    public RemoteSchemaProvider requireProvider(String namespace, String key) {
        RemoteSchemaProvider provider = findProvider(namespace, key);
        if (!hasPermission(provider)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
        return provider;
    }

    RemoteSchemaProvider findProvider(String namespace, String key) {
        RemoteSchemaProvider provider = providersByNamespace
                .getOrDefault(namespace, Map.of())
                .get(key);
        if (provider == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                    "remote schema not found: " + namespace + "/" + key);
        }
        return provider;
    }

    private boolean hasPermission(RemoteSchemaProvider provider) {
        String[] required = provider.requiredPermissions();
        if (required == null || required.length == 0) {
            return true;
        }
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (user == null || user.permissions() == null || user.permissions().isEmpty()) {
            return false;
        }
        if (user.permissions().contains("system:admin")) {
            return true;
        }
        for (String permission : required) {
            if (permission != null && !permission.isBlank() && user.permissions().contains(permission)) {
                return true;
            }
        }
        return false;
    }
}
