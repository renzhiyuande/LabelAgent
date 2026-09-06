package com.labelhub.infra.system.admin;

import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.persistence.entity.AuditLogEntity;
import com.labelhub.infra.persistence.mapper.AuditLogMapper;
import com.labelhub.infra.system.admin.mapper.AuditTrailMapper;
import com.labelhub.infra.util.Jsons;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AuditTrailService {
    private final AuditLogMapper auditLogMapper;
    private final AuditTrailMapper auditTrailMapper;
    private final com.labelhub.infra.audit.AuditRequestContext auditRequestContext;

    public AuditTrailService(
            AuditLogMapper auditLogMapper,
            AuditTrailMapper auditTrailMapper,
            com.labelhub.infra.audit.AuditRequestContext auditRequestContext) {
        this.auditLogMapper = auditLogMapper;
        this.auditTrailMapper = auditTrailMapper;
        this.auditRequestContext = auditRequestContext;
    }

    public void audit(String entityType, Long entityId, String actionCode, Object before, Object after) {
        AuditLogEntity audit = auditTrailMapper.toEntity(
                entityType,
                entityId == null ? 0L : entityId,
                actionCode,
                TraceContext.currentTraceId(),
                before == null ? null : Jsons.write(before),
                after == null ? null : Jsons.write(after));
        audit.setOperatorType(auditRequestContext.operatorType());
        audit.setOperatorId(auditRequestContext.operatorId());
        audit.setOperatorName(auditRequestContext.operatorName());
        audit.setRequestId(auditRequestContext.requestId());
        audit.setSourceIp(auditRequestContext.sourceIp());
        audit.setIdempotencyKey(auditRequestContext.idempotencyKey());
        audit.setOccurredAt(Instant.now());
        auditLogMapper.insert(audit);
    }
}
