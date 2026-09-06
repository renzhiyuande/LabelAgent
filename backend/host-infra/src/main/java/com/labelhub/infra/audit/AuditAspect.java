package com.labelhub.infra.audit;

import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditEntitySnapshotProvider;
import com.labelhub.core.audit.AuditRecorder;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.error.BusinessException;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

@Aspect
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AuditAspect {
    private final AuditRecorder auditRecorder;
    private final AuditEntitySnapshotProvider snapshotProvider;
    private final ExpressionParser expressionParser = new SpelExpressionParser();

    public AuditAspect(AuditRecorder auditRecorder, AuditEntitySnapshotProvider snapshotProvider) {
        this.auditRecorder = auditRecorder;
        this.snapshotProvider = snapshotProvider;
    }

    @Around("@annotation(audit)")
    public Object around(ProceedingJoinPoint joinPoint, Audit audit) throws Throwable {
        EvaluationContext context = buildContext(joinPoint, null, null);
        Long entityId = tryEvaluateEntityId(context, audit.entityId());
        Object before = resolveSnapshot(audit.before(), audit.beforeExpression(), audit.entityType(), entityId, context);
        Object result;
        try {
            result = joinPoint.proceed();
        } catch (Throwable throwable) {
            if (!(throwable instanceof BusinessException)) {
                throw throwable;
            }
            throw throwable;
        }
        EvaluationContext resultContext = buildContext(joinPoint, result, entityId);
        if (entityId == null) {
            entityId = tryEvaluateEntityId(resultContext, audit.entityId());
            resultContext.setVariable("entityId", entityId);
        }
        Object after = resolveAfterSnapshot(audit, entityId, result, resultContext);
        auditRecorder.record(audit.entityType(), entityId, audit.actionCode(), before, after);
        return result;
    }

    private EvaluationContext buildContext(ProceedingJoinPoint joinPoint, Object result, Long entityId) {
        StandardEvaluationContext context = new StandardEvaluationContext();
        Object[] args = joinPoint.getArgs();
        String[] names = ((MethodSignature) joinPoint.getSignature()).getParameterNames();
        if (names != null) {
            for (int i = 0; i < names.length; i++) {
                context.setVariable(names[i], args[i]);
            }
        }
        context.setVariable("args", args);
        context.setVariable("result", result);
        context.setVariable("entityId", entityId);
        context.setVariable("target", joinPoint.getTarget());
        return context;
    }

    private Long evaluateEntityId(EvaluationContext context, String expression) {
        if (expression == null || expression.isBlank()) {
            return null;
        }
        Object value = expressionParser.parseExpression(expression).getValue(context);
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private Long tryEvaluateEntityId(EvaluationContext context, String expression) {
        try {
            return evaluateEntityId(context, expression);
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private Object resolveAfterSnapshot(Audit audit, Long entityId, Object result, EvaluationContext context) {
        if (audit.after() == AuditSnapshotSource.RESULT) {
            return result;
        }
        return resolveSnapshot(audit.after(), audit.afterExpression(), audit.entityType(), entityId, context);
    }

    private Object resolveSnapshot(
            AuditSnapshotSource source,
            String expression,
            String entityType,
            Long entityId,
            EvaluationContext context) {
        return switch (source) {
            case NONE -> null;
            case ENTITY_BY_ID -> snapshotProvider.load(entityType, entityId);
            case EXPRESSION -> expression == null || expression.isBlank()
                    ? null
                    : expressionParser.parseExpression(expression).getValue(context);
            case RESULT -> context.lookupVariable("result");
        };
    }
}
