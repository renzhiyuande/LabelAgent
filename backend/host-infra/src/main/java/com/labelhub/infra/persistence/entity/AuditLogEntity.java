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
@TableName("audit_logs")
public class AuditLogEntity extends AbstractEntity {
    private String entityType;
    private Long entityId;
    private String actionCode;
    private String operatorType;
    private Long operatorId;
    private String operatorName;
    private String requestId;
    private String traceId;
    private String sourceIp;
    private String beforeJson;
    private String afterJson;
    private String diffJson;
    private String remark;
    private String idempotencyKey;
    private Instant occurredAt;
}
