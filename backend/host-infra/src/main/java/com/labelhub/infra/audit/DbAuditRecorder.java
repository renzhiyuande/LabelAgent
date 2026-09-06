package com.labelhub.infra.audit;

import com.labelhub.core.audit.AuditRecorder;
import com.labelhub.infra.system.admin.AuditTrailService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbAuditRecorder implements AuditRecorder {
    private final AuditTrailService auditTrailService;

    public DbAuditRecorder(AuditTrailService auditTrailService) {
        this.auditTrailService = auditTrailService;
    }

    @Override
    public void record(String entityType, Long entityId, String actionCode, Object before, Object after) {
        auditTrailService.audit(entityType, entityId, actionCode, before, after);
    }
}
