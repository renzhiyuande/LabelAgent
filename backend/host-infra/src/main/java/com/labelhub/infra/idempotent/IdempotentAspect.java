package com.labelhub.infra.idempotent;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.idempotent.Idempotent;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.concurrent.TimeUnit;

@Aspect
@Component
@ConditionalOnProperty(name = "labelhub.idempotent.enabled", havingValue = "true", matchIfMissing = true)
public class IdempotentAspect {

    private final StringRedisTemplate stringRedisTemplate;

    public IdempotentAspect(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    @Around("@annotation(idempotent)")
    public Object around(ProceedingJoinPoint joinPoint, Idempotent idempotent) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes != null ? attributes.getRequest() : null;

        String idemKey = null;

        if (idempotent.useRequestIdempotencyKey() && request != null) {
            idemKey = request.getHeader("Idempotency-Key");
        }

        if (idemKey == null || idemKey.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Idempotency-Key 不能为空");
        }

        String redisKey = idempotent.keyPrefix() + ":" + idemKey;
        TimeUnit timeUnit = idempotent.timeUnit();
        long expireSeconds = idempotent.timeUnit().toSeconds(idempotent.expireTime());

        Boolean locked = stringRedisTemplate.opsForValue().setIfAbsent(redisKey, "1", expireSeconds, timeUnit);

        if (!Boolean.TRUE.equals(locked)) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, idempotent.errorMessage());
        }

        try {
            return joinPoint.proceed();
        } catch (Throwable ex) {
            stringRedisTemplate.delete(redisKey);
            throw ex;
        }
    }
}
