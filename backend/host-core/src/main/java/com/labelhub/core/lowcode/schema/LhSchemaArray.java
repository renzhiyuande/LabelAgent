package com.labelhub.core.lowcode.schema;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Marks a {@code List} record component as an array field in generated form schema. */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.RECORD_COMPONENT)
public @interface LhSchemaArray {
    Class<?> itemRecord();

    int maxItems() default 5;
}
