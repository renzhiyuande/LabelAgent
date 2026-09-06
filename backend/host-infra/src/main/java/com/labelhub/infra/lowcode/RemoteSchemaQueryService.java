package com.labelhub.infra.lowcode;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class RemoteSchemaQueryService {
    private final RemoteSchemaRegistry remoteSchemaRegistry;
    private final RemoteSchemaCacheService remoteSchemaCacheService;

    public RemoteSchemaQueryService(
            RemoteSchemaRegistry remoteSchemaRegistry,
            RemoteSchemaCacheService remoteSchemaCacheService) {
        this.remoteSchemaRegistry = remoteSchemaRegistry;
        this.remoteSchemaCacheService = remoteSchemaCacheService;
    }

    public Map<String, Object> getFormSchema(String namespace, String key) {
        remoteSchemaRegistry.requireProvider(namespace, key);
        return remoteSchemaCacheService.getCachedFormSchema(namespace, key);
    }
}
