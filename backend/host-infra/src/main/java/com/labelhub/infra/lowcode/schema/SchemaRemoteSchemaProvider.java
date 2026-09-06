package com.labelhub.infra.lowcode.schema;

import com.labelhub.core.lowcode.schema.LhSchemaRoot;
import com.labelhub.infra.lowcode.RemoteSchemaProvider;
import java.util.Map;

public final class SchemaRemoteSchemaProvider implements RemoteSchemaProvider {
    private final Class<?> schemaClass;
    private final LhSchemaRoot root;

    public SchemaRemoteSchemaProvider(Class<?> schemaClass) {
        this.schemaClass = schemaClass;
        this.root = SchemaIntrospector.requireRoot(schemaClass);
    }

    public Class<?> schemaClass() {
        return schemaClass;
    }

    @Override
    public String namespace() {
        return root.namespace();
    }

    @Override
    public String key() {
        return root.key();
    }

    @Override
    public String label() {
        return root.label();
    }

    @Override
    public String[] requiredPermissions() {
        return root.permissions();
    }

    @Override
    public Map<String, Object> formSchema() {
        return SchemaIntrospector.buildFormSchema(schemaClass);
    }
}
