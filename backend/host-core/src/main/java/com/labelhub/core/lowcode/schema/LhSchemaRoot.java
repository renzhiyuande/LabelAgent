package com.labelhub.core.lowcode.schema;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface LhSchemaRoot {
    String namespace();

    String key();

    String label();

    String title() default "";

    String description() default "";

    String[] permissions() default {};
}
