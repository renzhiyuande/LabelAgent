package com.labelhub.infra.lowcode;

import java.util.Map;

/**
 * 远程 schema 提供者契约。
 *
 * <p>实现类通常由 {@link com.labelhub.infra.lowcode.schema.SchemaRemoteSchemaProvider}
 * 根据 {@link com.labelhub.core.lowcode.schema.LhSchemaRoot} 注解自动生成并注册，
 * 无需再手写 {@code @Component} 实现本接口。
 */
public interface RemoteSchemaProvider {
    String namespace();

    String key();

    String label();

    Map<String, Object> formSchema();

    String[] requiredPermissions();
}
