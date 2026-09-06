package com.labelhub.infra.config;

import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.util.Jsons;
import com.labelhub.infra.web.TraceLoggingFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class InfraAutoConfiguration {
    @Bean
    SimpleModule longToStringJacksonModule() {
        SimpleModule module = new SimpleModule();
        module.addSerializer(Long.class, ToStringSerializer.instance);
        module.addSerializer(Long.TYPE, ToStringSerializer.instance);
        return module;
    }

    @Bean
    FilterRegistrationBean<TraceLoggingFilter> traceLoggingFilter() {
        FilterRegistrationBean<TraceLoggingFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new TraceLoggingFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }

    @Bean
    InitializingBean jsonsInitializer(ObjectMapper objectMapper) {
        return () -> Jsons.setObjectMapper(objectMapper);
    }

    @Bean
    BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
