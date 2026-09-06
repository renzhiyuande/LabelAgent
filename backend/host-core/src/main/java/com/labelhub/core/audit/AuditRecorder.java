package com.labelhub.core.audit;

public interface AuditRecorder {
    void record(String entityType, Long entityId, String actionCode, Object before, Object after);
}
