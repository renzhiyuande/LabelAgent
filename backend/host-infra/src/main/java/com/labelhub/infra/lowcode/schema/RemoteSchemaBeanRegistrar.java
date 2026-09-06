package com.labelhub.infra.lowcode.schema;

import java.util.List;
import org.springframework.beans.factory.support.BeanDefinitionBuilder;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.context.annotation.ImportBeanDefinitionRegistrar;
import org.springframework.core.type.AnnotationMetadata;

public class RemoteSchemaBeanRegistrar implements ImportBeanDefinitionRegistrar {

    @Override
    public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
        List<Class<?>> schemaClasses = LhSchemaRootClasspathScanner.scan();
        LhSchemaRootClasspathScanner.validateUniqueKeys(schemaClasses);
        for (Class<?> schemaClass : schemaClasses) {
            registerProvider(registry, schemaClass);
        }
    }

    private void registerProvider(BeanDefinitionRegistry registry, Class<?> schemaClass) {
        if (registry.containsBeanDefinition(beanName(schemaClass))) {
            return;
        }
        BeanDefinitionBuilder builder = BeanDefinitionBuilder
                .genericBeanDefinition(SchemaRemoteSchemaProvider.class)
                .addConstructorArgValue(schemaClass);
        registry.registerBeanDefinition(beanName(schemaClass), builder.getBeanDefinition());
    }

    static String beanName(Class<?> schemaClass) {
        return "remoteSchemaProvider." + schemaClass.getSimpleName();
    }
}
