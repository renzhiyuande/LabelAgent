package com.labelhub.infra.datapermission;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.datapermission.DataPermissionService;
import com.labelhub.core.datapermission.DataScope;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Aspect
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DataScopeAspect {
    private static final ThreadLocal<DataPermissionRule> CONTEXT = new ThreadLocal<>();

    private final CurrentUserProvider currentUserProvider;
    private final DbDataPermissionService dataPermissionService;

    public DataScopeAspect(CurrentUserProvider currentUserProvider, DbDataPermissionService dataPermissionService) {
        this.currentUserProvider = currentUserProvider;
        this.dataPermissionService = dataPermissionService;
    }

    @Around("@annotation(dataScope)")
    public Object around(ProceedingJoinPoint joinPoint, DataScope dataScope) throws Throwable {
        AuthenticatedUser user = currentUserProvider.currentUser();
        DataPermissionRule rule = dataPermissionService.buildRule(user.roles(), dataScope.resource(), user.userId());
        CONTEXT.set(rule);
        try {
            return joinPoint.proceed();
        } finally {
            CONTEXT.remove();
        }
    }

    public static DataPermissionRule currentRule() {
        return CONTEXT.get();
    }
}
