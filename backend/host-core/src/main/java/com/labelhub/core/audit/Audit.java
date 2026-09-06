package com.labelhub.core.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audit {
    String entityType();

    String actionCode();

    String entityId();

    AuditSnapshotSource before() default AuditSnapshotSource.NONE;

    AuditSnapshotSource after() default AuditSnapshotSource.ENTITY_BY_ID;

    String beforeExpression() default "";

    String afterExpression() default "";
}
