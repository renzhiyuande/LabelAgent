package com.labelhub.infra.lowcode.schema;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
@Import(RemoteSchemaBeanRegistrar.class)
public class RemoteSchemaAutoConfiguration {
}
