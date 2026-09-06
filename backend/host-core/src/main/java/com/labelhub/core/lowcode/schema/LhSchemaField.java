package com.labelhub.core.lowcode.schema;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.RECORD_COMPONENT, ElementType.FIELD})
public @interface LhSchemaField {
    String label() default "";

    LhSchemaComponent component() default LhSchemaComponent.TEXT;

    String defaultValue() default "";

    String sectionKey() default "";

    String jsonKey() default "";

    boolean visible() default true;

    boolean readonly() default false;

    boolean required() default false;

    String description() default "";

    LhSchemaOption[] options() default {};

    LhSchemaRule[] rules() default {};
}
