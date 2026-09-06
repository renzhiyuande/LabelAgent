package com.labelhub.core.lowcode.schema;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({})
public @interface LhSchemaSection {
    String key();

    String title();
}
