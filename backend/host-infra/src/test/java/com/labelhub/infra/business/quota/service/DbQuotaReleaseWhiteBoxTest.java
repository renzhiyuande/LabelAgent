package com.labelhub.infra.business.quota.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.business.BusinessDtos.QuotaReleaseBatchSummary;
import com.labelhub.core.business.BusinessDtos.QuotaReleaseCommand;
import com.labelhub.core.business.distribute.DistributeStrategy;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.claimtoken.ClaimTokenStockService;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskQuotaReleaseBatchEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TaskQuotaReleaseBatchMapper;
import com.labelhub.infra.system.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P1 白盒 — 配额放量")
class DbQuotaReleaseWhiteBoxTest {

    @Mock
    private TaskQuotaReleaseBatchMapper batchMapper;
    @Mock
    private TaskMapper taskMapper;
    @Mock
    private ClaimTokenStockService claimTokenStockService;
    @Mock
    private CurrentUserContext currentUserContext;

    private DbQuotaReleaseService service;

    @BeforeEach
    void setUp() {
        service = new DbQuotaReleaseService(batchMapper, taskMapper, claimTokenStockService, currentUserContext);
    }

    @Test
    @DisplayName("WB-QTA-001: QUOTA 任务 releaseQuota 累加 Redis stock 并写 batch")
    void wbQta001_releaseQuotaIncrementsStockAndPersistsBatch() {
        TaskEntity task = quotaTask(15005L, 0);
        when(taskMapper.selectById(15005L)).thenReturn(task);
        when(batchMapper.selectCount(any())).thenReturn(0L);
        when(currentUserContext.userIdOrZero()).thenReturn(1001L);
        when(claimTokenStockService.incrementStock(15005L, 10)).thenReturn(10L);

        QuotaReleaseBatchSummary summary = service.releaseQuota(15005L, new QuotaReleaseCommand(10, "P1 test"));

        assertThat(summary.releaseCount()).isEqualTo(10);
        assertThat(summary.stockRemaining()).isEqualTo(10L);
        assertThat(task.getQuota()).isEqualTo(10);
        verify(claimTokenStockService).incrementStock(15005L, 10);

        ArgumentCaptor<TaskQuotaReleaseBatchEntity> captor = ArgumentCaptor.forClass(TaskQuotaReleaseBatchEntity.class);
        verify(batchMapper).insert(captor.capture());
        assertThat(captor.getValue().getReleaseCount()).isEqualTo(10);
        assertThat(captor.getValue().getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("WB-QTA-002: 非 QUOTA 策略 releaseQuota 拒绝")
    void wbQta002_releaseQuotaRejectsNonQuotaTask() {
        TaskEntity task = new TaskEntity();
        task.setId(15001L);
        task.setDeletedFlag(0);
        task.setDistributeStrategy(DistributeStrategy.FIRST_COME);
        when(taskMapper.selectById(15001L)).thenReturn(task);

        assertThatThrownBy(() -> service.releaseQuota(15001L, new QuotaReleaseCommand(5, null)))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).errorCode())
                .isEqualTo(ErrorCode.TASK_STRATEGY_NOT_QUOTA);
    }

    @Test
    @DisplayName("WB-QTA-004: listReleaseBatches 按任务过滤")
    void wbQta004_listReleaseBatchesByTask() {
        TaskQuotaReleaseBatchEntity batch = new TaskQuotaReleaseBatchEntity();
        batch.setId(1L);
        batch.setTaskId(15005L);
        batch.setBatchNo("QR-15005-1");
        batch.setReleaseCount(10);
        batch.setReleasedBy(1001L);
        batch.setReleasedAt(java.time.Instant.parse("2026-06-06T00:00:00Z"));
        batch.setStatus("ACTIVE");

        Page<TaskQuotaReleaseBatchEntity> page = new Page<>(1, 20);
        page.setRecords(java.util.List.of(batch));
        page.setTotal(1);
        when(batchMapper.selectPage(any(Page.class), any())).thenReturn(page);

        var response = service.listReleaseBatches(15005L,
                new com.labelhub.core.lowcode.query.ParsedListQuery(1, 20, null, java.util.List.of(), java.util.List.of()));

        assertThat(response.total()).isEqualTo(1);
        assertThat(response.list().getFirst().batchNo()).isEqualTo("QR-15005-1");
    }

    private static TaskEntity quotaTask(long taskId, int quota) {
        TaskEntity task = new TaskEntity();
        task.setId(taskId);
        task.setDeletedFlag(0);
        task.setDistributeStrategy(DistributeStrategy.QUOTA);
        task.setQuota(quota);
        return task;
    }
}
