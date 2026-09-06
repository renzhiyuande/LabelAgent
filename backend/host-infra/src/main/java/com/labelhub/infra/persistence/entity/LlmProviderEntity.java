package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("llm_providers")
public class LlmProviderEntity extends AbstractEntity {
    private String providerCode;
    private String providerName;
    private String baseUrl;
    private String apiKeyCiphertext;
    private String apiVersion;
    private String configJson;
    private Integer isSystemProvider;
    private Integer isDefault;
    private String status;
    private String lastHealthStatus;
    private Instant lastHealthCheckAt;
    private String lastErrorMessage;
}
