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
@TableName("auth_sessions")
public class AuthSessionEntity extends AbstractEntity {
    private Long userId;
    private String loginType;
    private String clientType;
    private String accessJti;
    private String accessTokenHash;
    private String deviceId;
    private String deviceName;
    private String ipAddress;
    private String userAgent;
    private String status;
    private Instant issuedAt;
    private Instant accessExpiresAt;
    private Instant refreshExpiresAt;
    private Instant lastSeenAt;
    private Instant logoutAt;
    private Instant revokedAt;
    private String revokeReason;
}
