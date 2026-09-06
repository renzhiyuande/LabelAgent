package com.labelhub.infra.system.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.system.SystemDtos.AsyncTaskSummary;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import com.labelhub.infra.persistence.mapper.AuditLogMapper;
import com.labelhub.infra.persistence.mapper.PermissionMapper;
import com.labelhub.infra.persistence.mapper.RolePermissionMapper;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.system.admin.mapper.OperationsAdminMapper;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — OperationsAdminService")
class OperationsAdminServiceWhiteBoxTest {

    @Mock
    private AuditLogMapper auditLogMapper;
    @Mock
    private AsyncTaskMapper asyncTaskMapper;
    @Mock
    private MybatisQueryApplier queryApplier;
    @Mock
    private OperationsAdminMapper operationsAdminMapper;
    @Mock
    private RolePermissionMapper rolePermissionMapper;
    @Mock
    private PermissionMapper permissionMapper;

    private OperationsAdminService service;

    @BeforeEach
    void setUp() {
        service = new OperationsAdminService(
                auditLogMapper, asyncTaskMapper, new AdminSupport(rolePermissionMapper, permissionMapper), queryApplier, operationsAdminMapper);
    }

    @Test
    @DisplayName("WB-ASYNC-007: retryAsyncTask 将 DEAD_LETTER 重置为 PENDING")
    void wbAsync007_retryAsyncTaskReopensDeadLetterTask() {
        AsyncTaskEntity entity = failedTask(9001L, Status.DEAD_LETTER);
        when(asyncTaskMapper.selectById(9001L)).thenReturn(entity);
        when(operationsAdminMapper.toAsyncTaskSummary(any()))
                .thenAnswer(invocation -> mapSummary(invocation.getArgument(0)));

        AsyncTaskSummary summary = service.retryAsyncTask(9001L);

        assertThat(summary.status()).isEqualTo(Status.PENDING);
        ArgumentCaptor<AsyncTaskEntity> captor = ArgumentCaptor.forClass(AsyncTaskEntity.class);
        verify(asyncTaskMapper).updateById(captor.capture());
        AsyncTaskEntity updated = captor.getValue();
        assertThat(updated.getStatus()).isEqualTo(Status.PENDING);
        assertThat(updated.getManualRetryCount()).isEqualTo(1);
        assertThat(updated.getDeadLetteredAt()).isNull();
        assertThat(updated.getNextRunAt()).isNotNull();
    }

    @Test
    @DisplayName("WB-ASYNC-007: 非 FAILED/DEAD_LETTER 任务不可重试")
    void wbAsync007_retryAsyncTaskRejectsNonRetryableStatus() {
        AsyncTaskEntity entity = failedTask(9002L, Status.PENDING);
        when(asyncTaskMapper.selectById(9002L)).thenReturn(entity);

        assertThatThrownBy(() -> service.retryAsyncTask(9002L))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).errorCode())
                        .isEqualTo(ErrorCode.INVALID_OPERATION));
    }

    private static AsyncTaskSummary mapSummary(AsyncTaskEntity entity) {
        return new AsyncTaskSummary(
                entity.getId(),
                entity.getTaskType(),
                entity.getBizType(),
                entity.getBizId(),
                entity.getBizKey(),
                entity.getPriority() == null ? 0 : entity.getPriority(),
                entity.getStatus(),
                entity.getRetryCount() == null ? 0 : entity.getRetryCount(),
                entity.getMaxRetryCount() == null ? 0 : entity.getMaxRetryCount(),
                entity.getManualRetryCount() == null ? 0 : entity.getManualRetryCount(),
                entity.getNextRunAt(),
                entity.getWorkerId(),
                entity.getLastErrorCode(),
                entity.getLastErrorMessage());
    }

    private static AsyncTaskEntity failedTask(long id, String status) {
        AsyncTaskEntity entity = new AsyncTaskEntity();
        entity.setId(id);
        entity.setDeletedFlag(0);
        entity.setTaskType("AI_REVIEW");
        entity.setStatus(status);
        entity.setManualRetryCount(0);
        entity.setDeadLetteredAt(Instant.now());
        entity.setLastErrorCode("TIMEOUT");
        entity.setLastErrorMessage("agent timeout");
        return entity;
    }
}
