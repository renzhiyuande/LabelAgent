package com.labelhub.app.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.security.InternalTokenFilter;
import com.labelhub.infra.security.UserTokenAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private final ObjectMapper objectMapper;
    private final InternalTokenFilter internalTokenFilter;
    private final UserTokenAuthenticationFilter userTokenAuthenticationFilter;

    public SecurityConfig(
            ObjectMapper objectMapper,
            InternalTokenFilter internalTokenFilter,
            UserTokenAuthenticationFilter userTokenAuthenticationFilter) {
        this.objectMapper = objectMapper;
        this.internalTokenFilter = internalTokenFilter;
        this.userTokenAuthenticationFilter = userTokenAuthenticationFilter;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/system/health",
                                "/api/v1/system/dicts/**", "/v3/api-docs/**", "/doc.html", "/swagger-ui.html",
                                "/swagger-ui/**", "/webjars/**", "/favicon.ico", "/actuator/health")
                        .permitAll()
                        .requestMatchers("/internal/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                writeFailure(response, ErrorCode.AUTH_UNAUTHENTICATED))
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            ErrorCode code = request.getRequestURI().startsWith("/internal/")
                                    ? ErrorCode.INTERNAL_UNAUTHORIZED
                                    : ErrorCode.AUTH_FORBIDDEN;
                            writeFailure(response, code);
                        }))
                .addFilterBefore(internalTokenFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(userTokenAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private void writeFailure(HttpServletResponse response, ErrorCode code) throws IOException {
        response.setStatus(code.status());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(),
                ApiResponse.failure(code.errCode(), code.defaultMessage(), TraceContext.currentTraceId()));
    }
}
