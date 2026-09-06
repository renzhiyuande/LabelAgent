package com.labelhub.infra.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MinIO 客户端配置。{@link MinioClient} 在构建时不会建立连接，因此即使本地未启动 MinIO，
 * 应用仍可正常启动；只有真正执行上传/下载时才会访问服务端。
 */
@Configuration
public class MinioConfiguration {

    @Bean
    public MinioClient minioClient(
            @Value("${labelhub.storage.minio.endpoint:http://localhost:9000}") String endpoint,
            @Value("${labelhub.storage.minio.access-key}") String accessKey,
            @Value("${labelhub.storage.minio.secret-key}") String secretKey) {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
