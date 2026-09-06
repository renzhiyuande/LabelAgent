package com.labelhub.core.idempotent;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.concurrent.TimeUnit;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {
    String keyPrefix() default "";

    int expireTime() default 5;

    TimeUnit timeUnit() default TimeUnit.MINUTES;

    String errorMessage() default "重复请求，请稍后重试";

    boolean useRequestIdempotencyKey() default true;
}
