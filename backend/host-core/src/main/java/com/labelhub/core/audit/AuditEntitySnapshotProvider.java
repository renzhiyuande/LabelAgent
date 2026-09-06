package com.labelhub.core.audit;

public interface AuditEntitySnapshotProvider {
    Object load(String entityType, Long entityId);
}
