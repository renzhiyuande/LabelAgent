package com.labelhub.infra.authz;

import com.labelhub.core.authz.AuthorizationFacade;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.authz.RequirePermission;
import com.labelhub.core.authz.RequireRole;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuthorizationAspect {
    private final AuthorizationFacade authorizationFacade;

    public AuthorizationAspect(AuthorizationFacade authorizationFacade) {
        this.authorizationFacade = authorizationFacade;
    }

    @Around("@annotation(requirePermission)")
    public Object requirePermission(ProceedingJoinPoint joinPoint, RequirePermission requirePermission) throws Throwable {
        authorizationFacade.requirePermission(requirePermission.value());
        return joinPoint.proceed();
    }

    @Around("@annotation(requireAnyPermission)")
    public Object requireAnyPermission(ProceedingJoinPoint joinPoint, RequireAnyPermission requireAnyPermission) throws Throwable {
        authorizationFacade.requireAnyPermission(requireAnyPermission.value());
        return joinPoint.proceed();
    }

    @Around("@annotation(requireRole)")
    public Object requireRole(ProceedingJoinPoint joinPoint, RequireRole requireRole) throws Throwable {
        authorizationFacade.requireRole(requireRole.value());
        return joinPoint.proceed();
    }
}
