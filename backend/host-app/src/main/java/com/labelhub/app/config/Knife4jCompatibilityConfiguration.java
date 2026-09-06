package com.labelhub.app.config;

import com.github.xiaoymin.knife4j.spring.configuration.Knife4jProperties;
import com.github.xiaoymin.knife4j.spring.configuration.Knife4jSetting;
import com.github.xiaoymin.knife4j.spring.extension.Knife4jJakartaOperationCustomizer;
import com.github.xiaoymin.knife4j.spring.extension.OpenApiExtensionResolver;
import io.swagger.v3.oas.models.OpenAPI;
import java.util.HashMap;
import java.util.Map;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import org.springdoc.core.customizers.GlobalOperationCustomizer;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
@EnableConfigurationProperties(Knife4jProperties.class)
public class Knife4jCompatibilityConfiguration {
    @Bean
    @Primary
    GlobalOpenApiCustomizer knife4jOpenApiCustomizer(Knife4jProperties knife4jProperties) {
        return new CompatibleKnife4jOpenApiCustomizer(knife4jProperties);
    }

    @Bean
    GlobalOperationCustomizer knife4jOperationCustomizer() {
        return new Knife4jJakartaOperationCustomizer();
    }

    static final class CompatibleKnife4jOpenApiCustomizer implements GlobalOpenApiCustomizer {
        private final Knife4jProperties knife4jProperties;

        CompatibleKnife4jOpenApiCustomizer(Knife4jProperties knife4jProperties) {
            this.knife4jProperties = knife4jProperties;
        }

        @Override
        public void customise(OpenAPI openApi) {
            if (!knife4jProperties.isEnable()) {
                return;
            }
            Knife4jSetting setting = knife4jProperties.getSetting();
            OpenApiExtensionResolver resolver =
                    new OpenApiExtensionResolver(setting, knife4jProperties.getDocuments());
            resolver.start();
            Map<String, Object> extensions = new HashMap<>();
            extensions.put("x-setting", setting);
            extensions.put("x-markdownFiles", resolver.getMarkdownFiles());
            openApi.addExtension("x-openapi", extensions);
        }
    }
}
