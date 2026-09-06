package com.labelhub.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(
        scanBasePackages = "com.labelhub",
        excludeName = "com.github.xiaoymin.knife4j.spring.configuration.Knife4jAutoConfiguration")
@EnableScheduling
public class LabelHubApplication {
    public static void main(String[] args) {
        SpringApplication.run(LabelHubApplication.class, args);
    }
}
