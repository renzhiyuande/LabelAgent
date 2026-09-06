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
@TableName("auth_refresh_tokens")
public class AuthRefreshTokenEntity extends AbstractEntity {
    private Long sessionId;
    private Long userId;
    private String refreshTokenHash;
    private Integer rotateNo;
    private String status;
    private Instant issuedAt;
    private Instant expiresAt;
    private Instant usedAt;
    private Instant revokedAt;
    private Long replacedByTokenId;
    private String revokeReason;
}
