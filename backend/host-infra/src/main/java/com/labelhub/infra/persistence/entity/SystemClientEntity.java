package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@TableName("system_clients")
public class SystemClientEntity extends AbstractEntity {
    private String clientCode;
    private String clientName;
    private String clientSecretHash;
    private String clientType;
    private String allowedScopesJson;
    private String ipWhitelistJson;
    private String status;
    private Instant lastUsedAt;
    private Instant expiresAt;
}
