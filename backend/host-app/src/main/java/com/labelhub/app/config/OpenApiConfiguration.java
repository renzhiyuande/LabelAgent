package com.labelhub.app.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {
    private static final String BEARER_SCHEME = "bearerAuth";
    private static final String INTERNAL_TOKEN_SCHEME = "internalToken";

    @Bean
    OpenAPI labelHubOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Label Hub API")
                        .description("Label Hub system services and administration APIs")
                        .version("v1")
                        .contact(new Contact().name("Label Hub")))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("Authorization")
                                .description("User access token header, use format: Bearer <accessToken>"))
                        .addSecuritySchemes(INTERNAL_TOKEN_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("X-Internal-Token")
                                .description("Internal system client token")));
    }

    @Bean
    GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
                .group("public")
                .pathsToMatch("/api/**")
                .addOpenApiCustomizer(securityCustomizer(BEARER_SCHEME))
                .build();
    }

    @Bean
    GroupedOpenApi internalApi() {
        return GroupedOpenApi.builder()
                .group("internal")
                .pathsToMatch("/internal/**")
                .addOpenApiCustomizer(securityCustomizer(INTERNAL_TOKEN_SCHEME))
                .build();
    }

    private OpenApiCustomizer securityCustomizer(String schemeName) {
        SecurityRequirement requirement = new SecurityRequirement().addList(schemeName);
        return openApi -> {
            openApi.setSecurity(java.util.List.of(requirement));
            if (openApi.getPaths() == null) {
                return;
            }
            openApi.getPaths().values().forEach(pathItem -> pathItem.readOperations()
                    .forEach(operation -> operation.setSecurity(java.util.List.of(new SecurityRequirement().addList(schemeName)))));
        };
    }
}
