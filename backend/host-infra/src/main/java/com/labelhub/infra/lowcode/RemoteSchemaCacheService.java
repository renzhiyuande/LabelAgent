package com.labelhub.infra.lowcode;

import java.util.Map;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class RemoteSchemaCacheService {
    private final RemoteSchemaRegistry remoteSchemaRegistry;

    public RemoteSchemaCacheService(RemoteSchemaRegistry remoteSchemaRegistry) {
        this.remoteSchemaRegistry = remoteSchemaRegistry;
    }

    @Cacheable(value = "remoteSchemas", key = "#namespace + ':' + #key")
    public Map<String, Object> getCachedFormSchema(String namespace, String key) {
        return remoteSchemaRegistry.findProvider(namespace, key).formSchema();
    }
}
