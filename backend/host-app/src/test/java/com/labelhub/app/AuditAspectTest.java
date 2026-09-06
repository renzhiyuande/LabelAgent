package com.labelhub.app;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditEntitySnapshotProvider;
import com.labelhub.core.audit.AuditRecorder;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.infra.audit.AuditAspect;
import java.lang.reflect.Method;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuditAspectTest {

    @Mock
    private AuditRecorder auditRecorder;

    @Mock
    private AuditEntitySnapshotProvider snapshotProvider;

    @Mock
    private ProceedingJoinPoint joinPoint;

    @Mock
    private MethodSignature methodSignature;

    @Test
    void createActionCanResolveEntityIdFromResultAfterProceed() throws Throwable {
        AuditAspect aspect = new AuditAspect(auditRecorder, snapshotProvider);
        Method method = TestAuditTarget.class.getDeclaredMethod("create");
        Audit audit = method.getAnnotation(Audit.class);
        TestResult result = new TestResult(42L);

        when(joinPoint.getSignature()).thenReturn(methodSignature);
        when(methodSignature.getParameterNames()).thenReturn(new String[0]);
        when(joinPoint.getArgs()).thenReturn(new Object[0]);
        when(joinPoint.getTarget()).thenReturn(new TestAuditTarget());
        when(joinPoint.proceed()).thenReturn(result);

        aspect.around(joinPoint, audit);

        verify(auditRecorder).record("DICT_TYPE", 42L, "dictType.create", null, result);
    }

    static class TestAuditTarget {
        @Audit(
                entityType = "DICT_TYPE",
                actionCode = "dictType.create",
                entityId = "#result.id()",
                after = AuditSnapshotSource.RESULT)
        public TestResult create() {
            return new TestResult(42L);
        }
    }

    record TestResult(Long id) {}
}
