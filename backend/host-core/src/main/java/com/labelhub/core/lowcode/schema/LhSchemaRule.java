package com.labelhub.core.lowcode.schema;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({})
public @interface LhSchemaRule {
    String type();

    String value();

    String message();
}
