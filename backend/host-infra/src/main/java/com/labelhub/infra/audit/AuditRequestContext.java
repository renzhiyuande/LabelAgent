package com.labelhub.infra.audit;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.system.CurrentUserContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AuditRequestContext {
    private final CurrentUserContext currentUserContext;

    public AuditRequestContext(CurrentUserContext currentUserContext) {
        this.currentUserContext = currentUserContext;
    }

    public String traceId() {
        return TraceContext.currentTraceId();
    }

    public String requestId() {
        return org.slf4j.MDC.get(TraceContext.REQUEST_ID);
    }

    public String sourceIp() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public String idempotencyKey() {
        HttpServletRequest request = currentRequest();
        return request == null ? null : request.getHeader("Idempotency-Key");
    }

    public Long operatorId() {
        return currentUserContext.userIdOrZero();
    }

    public String operatorName() {
        AuthenticatedUser user = currentUserContext.userOrNull();
        if (user == null) {
            return "system";
        }
        return user.displayName() == null || user.displayName().isBlank() ? user.username() : user.displayName();
    }

    public String operatorType() {
        return currentUserContext.userOrNull() == null ? "SYSTEM" : "USER";
    }

    private HttpServletRequest currentRequest() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletRequestAttributes) {
            return servletRequestAttributes.getRequest();
        }
        return null;
    }
}
