package com.labelhub.infra.business;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.baomidou.mybatisplus.core.conditions.AbstractWrapper;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.enums.SqlKeyword;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.business.BusinessDtos.RewardBatchSummary;
import com.labelhub.core.business.BusinessDtos.RewardDetailRow;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.business.display.assembler.RewardDetailDisplayAssembler;
import com.labelhub.infra.business.display.assembler.RewardDetailDisplayAssembler.CalcBasisDisplayLabels;
import com.labelhub.infra.business.reward.service.DbRewardSettlementService;
import com.labelhub.infra.business.reward.strategy.PerApprovedRewardStrategy;
import com.labelhub.infra.business.reward.strategy.RewardStrategyRegistry;
import com.labelhub.infra.persistence.entity.RewardSettlementBatchEntity;
import com.labelhub.infra.persistence.entity.RewardSettlementDetailEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.mapper.RewardSettlementBatchMapper;
import com.labelhub.infra.persistence.mapper.RewardSettlementDetailMapper;
import com.labelhub.infra.persistence.mapper.result.RewardBatchAggregateStats;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.dao.DuplicateKeyException;
import com.labelhub.infra.business.reward.handler.RewardExportTaskHandler;
import com.labelhub.core.business.reward.RewardContext;

class DbRewardSettlementServiceTest {

    private MapperStub<RewardSettlementBatchEntity, RewardSettlementBatchMapper> batchMapperStub;
    private MapperStub<RewardSettlementDetailEntity, RewardSettlementDetailMapper> detailMapperStub;
    private MapperStub<TaskEntity, TaskMapper> taskMapperStub;
    private MapperStub<SubmissionEntity, SubmissionMapper> submissionMapperStub;
    private DbRewardSettlementService service;
    private AsyncTaskService asyncTaskService;

    @BeforeEach
    void setUp() {
        batchMapperStub = MapperStub.create(RewardSettlementBatchMapper.class);
        detailMapperStub = MapperStub.create(RewardSettlementDetailMapper.class);
        taskMapperStub = MapperStub.create(TaskMapper.class);
        submissionMapperStub = MapperStub.create(SubmissionMapper.class);
        asyncTaskService = org.mockito.Mockito.mock(AsyncTaskService.class);
        CurrentUserContext currentUserContext = new CurrentUserContext(
                () -> new AuthenticatedUser(1001L, "user1001", Set.of()));
        UserDisplayNameResolver userDisplayNameResolver = new UserDisplayNameResolver(
                proxy(UserMapper.class, this::handleUserMapper)) {
            @Override
            public String resolve(Long userId) {
                return userId == null ? null : "User#" + userId;
            }

            @Override
            public String resolve(Long userId, String fallback) {
                return fallback;
            }
        };
        RewardStrategyRegistry strategyRegistry = new RewardStrategyRegistry(List.of(new PerApprovedRewardStrategy()));

        RewardDetailDisplayAssembler rewardDetailDisplayAssembler =
                org.mockito.Mockito.mock(RewardDetailDisplayAssembler.class);
        org.mockito.Mockito.when(rewardDetailDisplayAssembler.assembleCalcBasisLabels(org.mockito.ArgumentMatchers.any()))
                .thenReturn(CalcBasisDisplayLabels.empty());

        service = new DbRewardSettlementService(
                batchMapperStub.proxy,
                detailMapperStub.proxy,
                submissionMapperStub.proxy,
                taskMapperStub.proxy,
                strategyRegistry,
                asyncTaskService,
                currentUserContext,
                userDisplayNameResolver,
                MapperStub.create(com.labelhub.infra.persistence.mapper.FileAssetMapper.class).proxy,
                new ObjectMapper(),
                rewardDetailDisplayAssembler);
    }

    @Test
    void listBatchesRetainsKeywordSearchWhenNoTaskTitleMatches() {
        RewardSettlementBatchEntity batch = new RewardSettlementBatchEntity();
        batch.setId(11L);
        batch.setTaskId(101L);
        batch.setBatchNo("RB-KEYWORD-001");
        batch.setStatus("CONFIRMED");
        batch.setSettleScope("APPROVED_ONLY");
        batch.setCurrencyCode("CNY");
        batch.setTargetTotalCount(1);
        batch.setEffectiveTotalCount(1);
        batch.setUserTotalCount(1);
        batch.setTotalAmount(BigDecimal.ONE);
        batch.setCreatedAt(Instant.parse("2026-06-02T00:00:00Z"));

        TaskEntity task = new TaskEntity();
        task.setId(101L);
        task.setDeletedFlag(0);
        task.setTitle("Unrelated task title");

        taskMapperStub.selectListResult = List.of();
        batchMapperStub.selectPageHandler = page -> pageWithRecords(page, List.of(batch));
        taskMapperStub.selectBatchIdsResult = List.of(task);

        PageResponse<RewardBatchSummary> response = service.listBatches(
                null,
                new ParsedListQuery(1, 20, "KEYWORD", List.of(), List.of()));

        assertThat(response.total()).isEqualTo(1);
        assertThat(response.list()).hasSize(1);
        assertThat(response.list().getFirst().batchNo()).isEqualTo("RB-KEYWORD-001");
        assertThat(batchMapperStub.lastWrapperContains(SqlKeyword.IS_NULL)).isFalse();
    }

    @Test
    @DisplayName("WB-RWD-008: listMyRewards 仅返回当前用户明细")
    void wbRwd008_listMyRewardsRetainsKeywordSearchWhenTaskAndBatchLookupsMiss() {
        RewardSettlementDetailEntity detail = new RewardSettlementDetailEntity();
        detail.setId(21L);
        detail.setBatchId(31L);
        detail.setTaskId(41L);
        detail.setUserId(1001L);
        detail.setSubmissionId(51L);
        detail.setSubmissionVersionId(61L);
        detail.setAssignmentId(71L);
        detail.setCurrencyCode("CNY");
        detail.setAmount(new BigDecimal("12.50"));
        detail.setStatus("PENDING");
        detail.setRewardReason("KEYWORD_MATCH");
        detail.setCreatedAt(Instant.parse("2026-06-02T00:00:00Z"));

        RewardSettlementBatchEntity batch = new RewardSettlementBatchEntity();
        batch.setId(31L);
        batch.setTaskId(41L);
        batch.setDeletedFlag(0);
        batch.setBatchNo("RB-001");
        batch.setStatus("DRAFT");

        TaskEntity task = new TaskEntity();
        task.setId(41L);
        task.setDeletedFlag(0);
        task.setTitle("Other title");

        taskMapperStub.selectListResult = List.of();
        batchMapperStub.selectListResult = List.of();
        detailMapperStub.selectPageHandler = page -> pageWithRecords(page, List.of(detail));
        batchMapperStub.selectBatchIdsResult = List.of(batch);
        taskMapperStub.selectBatchIdsResult = List.of(task);

        PageResponse<RewardDetailRow> response = service.listMyRewards(
                new ParsedListQuery(1, 20, "KEYWORD", List.of(), List.of()));

        assertThat(response.total()).isEqualTo(1);
        assertThat(response.list()).hasSize(1);
        assertThat(response.list().getFirst().rewardReason()).isEqualTo("KEYWORD_MATCH");
        assertThat(detailMapperStub.lastWrapperContains(SqlKeyword.IS_NULL)).isFalse();
    }

    @Test
    void refreshBatchAggregatesWritesAggregateStatsToBatch() throws Exception {
        RewardSettlementBatchEntity batch = new RewardSettlementBatchEntity();
        batch.setId(99L);
        batch.setTenantId(1L);
        batch.setTaskId(101L);
        batch.setBatchNo("RB-AGG-001");
        batch.setStatus("DRAFT");
        batch.setSettleScope("APPROVED_ONLY");
        batch.setCurrencyCode("CNY");
        batch.setTargetTotalCount(0);
        batch.setEffectiveTotalCount(0);
        batch.setUserTotalCount(0);
        batch.setTotalAmount(BigDecimal.ZERO);
        batch.setCreatedAt(Instant.parse("2026-06-02T00:00:00Z"));

        batchMapperStub.selectByIdResult.put(99L, batch);
        detailMapperStub.aggregateStatsResult = new RewardBatchAggregateStats(5L, 3L, new BigDecimal("123.45"));

        Method refresh = DbRewardSettlementService.class.getDeclaredMethod("refreshBatchAggregates", Long.class, int.class);
        refresh.setAccessible(true);
        refresh.invoke(service, 99L, 12);

        assertThat(batch.getTargetTotalCount()).isEqualTo(12);
        assertThat(batch.getEffectiveTotalCount()).isEqualTo(5);
        assertThat(batch.getUserTotalCount()).isEqualTo(3);
        assertThat(batch.getTotalAmount()).isEqualByComparingTo("123.45");
        assertThat(batch.getUpdatedAt()).isNotNull();
    }

    @Test
    void updateAllDetailsStatusUsesBatchUpdateMapperMethod() throws Exception {
        Method updateAll = DbRewardSettlementService.class.getDeclaredMethod(
                "updateAllDetailsStatus", Long.class, String.class, Instant.class, boolean.class, boolean.class, boolean.class);
        updateAll.setAccessible(true);
        Instant now = Instant.parse("2026-06-03T00:00:00Z");

        updateAll.invoke(service, 88L, "CONFIRMED", now, true, true, false);

        assertThat(detailMapperStub.updateStatusByBatchIdCalls).isEqualTo(1);
        assertThat(detailMapperStub.lastUpdateStatusBatchId).isEqualTo(88L);
        assertThat(detailMapperStub.lastUpdateStatus).isEqualTo("CONFIRMED");
        assertThat(detailMapperStub.lastUpdateStatusNow).isEqualTo(now);
        assertThat(detailMapperStub.lastKeepReversedUnchanged).isTrue();
        assertThat(detailMapperStub.lastSetSettledAt).isTrue();
        assertThat(detailMapperStub.lastSetReversedAt).isFalse();
    }

    @Test
    @DisplayName("WB-RWD-001: recordApprovedSubmission 预写 reward_detail")
    void wbRwd001_recordApprovedSubmissionCreatesDetail() {
        TaskEntity task = approvedRewardTask();
        RewardSettlementBatchEntity batch = draftBatch(201L, 101L);
        SubmissionEntity submission = approvedSubmission(301L, 101L, 501L);

        taskMapperStub.selectByIdResult.put(101L, task);
        batchMapperStub.selectOneResult = batch;
        batchMapperStub.selectByIdResult.put(201L, batch);
        submissionMapperStub.selectByIdResult.put(301L, submission);
        submissionMapperStub.selectListResult = List.of(submission);
        detailMapperStub.selectCountResult = 0;
        detailMapperStub.distinctIdsResult = List.of();
        detailMapperStub.aggregateStatsResult = new RewardBatchAggregateStats(1L, 1L, new BigDecimal("5.00"));

        service.recordApprovedSubmission(301L);

        assertThat(detailMapperStub.insertCalls).isEqualTo(1);
        assertThat(detailMapperStub.lastInsertedDetail).isNotNull();
        assertThat(detailMapperStub.lastInsertedDetail.getAmount()).isEqualByComparingTo("5.00");
        assertThat(detailMapperStub.lastInsertedDetail.getSubmissionId()).isEqualTo(301L);
        assertThat(detailMapperStub.lastInsertedDetail.getStatus()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("WB-RWD-002: createBatch 聚合 APPROVED 明细到 DRAFT 批次")
    void wbRwd002_createBatchAggregatesApprovedSubmissions() {
        TaskEntity task = approvedRewardTask();
        RewardSettlementBatchEntity batch = draftBatch(201L, 101L);
        List<SubmissionEntity> approved = List.of(
                approvedSubmission(301L, 101L, 501L),
                approvedSubmission(302L, 101L, 502L),
                approvedSubmission(303L, 101L, 503L));

        taskMapperStub.selectByIdResult.put(101L, task);
        batchMapperStub.selectOneResult = batch;
        batchMapperStub.selectByIdResult.put(201L, batch);
        submissionMapperStub.selectListResult = approved;
        detailMapperStub.distinctIdsResult = List.of();
        detailMapperStub.aggregateStatsResult = new RewardBatchAggregateStats(3L, 2L, new BigDecimal("15.00"));

        RewardBatchSummary summary = service.createBatch(101L);

        assertThat(detailMapperStub.insertCalls).isEqualTo(3);
        assertThat(summary.status()).isEqualTo("DRAFT");
        assertThat(summary.effectiveTotalCount()).isEqualTo(3);
        assertThat(summary.totalAmount()).isEqualByComparingTo("15.00");
    }

    @Test
    @DisplayName("WB-RWD-003: confirmBatch DRAFT → CONFIRMED")
    void wbRwd003_confirmBatchTransitionsToConfirmed() {
        RewardSettlementBatchEntity batch = draftBatch(201L, 101L);
        TaskEntity task = approvedRewardTask();
        batchMapperStub.selectByIdResult.put(201L, batch);
        taskMapperStub.selectByIdResult.put(101L, task);

        RewardBatchSummary summary = service.confirmBatch(201L);

        assertThat(batch.getStatus()).isEqualTo("CONFIRMED");
        assertThat(summary.status()).isEqualTo("CONFIRMED");
        assertThat(detailMapperStub.updateStatusByBatchIdCalls).isEqualTo(1);
        assertThat(detailMapperStub.lastUpdateStatus).isEqualTo("CONFIRMED");
    }

    @Test
    @DisplayName("WB-RWD-004: markPaid CONFIRMED → PAID")
    void wbRwd004_markPaidTransitionsToPaid() {
        RewardSettlementBatchEntity batch = draftBatch(201L, 101L);
        batch.setStatus("CONFIRMED");
        TaskEntity task = approvedRewardTask();
        batchMapperStub.selectByIdResult.put(201L, batch);
        taskMapperStub.selectByIdResult.put(101L, task);

        RewardBatchSummary summary = service.markPaid(201L);

        assertThat(batch.getStatus()).isEqualTo("PAID");
        assertThat(summary.status()).isEqualTo("PAID");
        assertThat(detailMapperStub.lastUpdateStatus).isEqualTo("PAID");
    }

    @Test
    @DisplayName("WB-RWD-005: reverseBatch PAID → REVERSED")
    void wbRwd005_reverseBatchMarksReversed() {
        RewardSettlementBatchEntity batch = draftBatch(201L, 101L);
        batch.setStatus("PAID");
        TaskEntity task = approvedRewardTask();
        batchMapperStub.selectByIdResult.put(201L, batch);
        taskMapperStub.selectByIdResult.put(101L, task);

        RewardBatchSummary summary = service.reverseBatch(201L);

        assertThat(batch.getStatus()).isEqualTo("REVERSED");
        assertThat(summary.status()).isEqualTo("REVERSED");
        assertThat(detailMapperStub.lastUpdateStatus).isEqualTo("REVERSED");
        assertThat(detailMapperStub.lastSetReversedAt).isTrue();
    }

    @Test
    @DisplayName("WB-RWD-006: PerApprovedRewardStrategy 单价 5 元计酬")
    void wbRwd006_perApprovedStrategyCalculatesBaseAmount() {
        PerApprovedRewardStrategy strategy = new PerApprovedRewardStrategy();
        Map<String, Object> rule = Map.of("mode", "PER_APPROVED", "base_amount", 5);

        BigDecimal amount = strategy.calculate(new RewardContext(101L, 1001L, 301L, 501L, null, rule));

        assertThat(amount).isEqualByComparingTo("5");
    }

    @Test
    @DisplayName("WB-RWD-007: exportBatch 入队 REWARD_EXPORT 异步任务")
    void wbRwd007_exportBatchEnqueuesAsyncTask() {
        RewardSettlementBatchEntity batch = draftBatch(201L, 101L);
        batch.setStatus("CONFIRMED");
        TaskEntity task = approvedRewardTask();
        batchMapperStub.selectByIdResult.put(201L, batch);
        taskMapperStub.selectByIdResult.put(101L, task);

        service.exportBatch(201L);

        org.mockito.Mockito.verify(asyncTaskService).enqueue(
                ArgumentMatchers.eq(RewardExportTaskHandler.TASK_TYPE),
                ArgumentMatchers.eq("REWARD_BATCH"),
                ArgumentMatchers.eq(201L),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyInt(),
                ArgumentMatchers.anyMap());
    }

    @Test
    void recordApprovedSubmissionTreatsDuplicateInsertAsIdempotentSuccess() {
        TaskEntity task = new TaskEntity();
        task.setId(101L);
        task.setTenantId(1L);
        task.setDeletedFlag(0);
        task.setRewardRuleJson("{\"mode\":\"PER_APPROVED\",\"currency\":\"CNY\",\"base_amount\":12}");

        RewardSettlementBatchEntity batch = new RewardSettlementBatchEntity();
        batch.setId(201L);
        batch.setTaskId(101L);
        batch.setTenantId(1L);
        batch.setDeletedFlag(0);
        batch.setStatus("DRAFT");
        batch.setSettleScope("APPROVED_ONLY");
        batch.setCurrencyCode("CNY");
        batch.setTargetTotalCount(0);
        batch.setEffectiveTotalCount(0);
        batch.setUserTotalCount(0);
        batch.setTotalAmount(BigDecimal.ZERO);
        batch.setCreatedAt(Instant.parse("2026-06-02T00:00:00Z"));

        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(301L);
        submission.setTaskId(101L);
        submission.setAssignmentId(401L);
        submission.setLabelerId(1001L);
        submission.setCurrentVersionId(501L);
        submission.setCurrentStatus("APPROVED");
        submission.setDeletedFlag(0);

        taskMapperStub.selectByIdResult.put(101L, task);
        batchMapperStub.selectByIdResult.put(201L, batch);
        batchMapperStub.selectOneResult = batch;
        submissionMapperStub.selectByIdResult.put(301L, submission);
        submissionMapperStub.selectListResult = List.of(submission);
        detailMapperStub.aggregateStatsResult = new RewardBatchAggregateStats(0L, 0L, BigDecimal.ZERO);
        detailMapperStub.insertException = new DuplicateKeyException("dup");

        service.recordApprovedSubmission(301L);

        assertThat(detailMapperStub.insertCalls).isEqualTo(1);
        assertThat(batch.getTargetTotalCount()).isEqualTo(1);
        assertThat(batch.getEffectiveTotalCount()).isEqualTo(0);
        assertThat(task.getRewardSettlementStatus()).isEqualTo("DRAFT");
    }

    @Test
    void recordApprovedSubmissionRejectsRewardRuleWithoutMode() {
        TaskEntity task = new TaskEntity();
        task.setId(101L);
        task.setTenantId(1L);
        task.setDeletedFlag(0);
        task.setRewardRuleJson("{\"currency\":\"CNY\",\"base_amount\":12}");

        RewardSettlementBatchEntity batch = new RewardSettlementBatchEntity();
        batch.setId(201L);
        batch.setTaskId(101L);
        batch.setTenantId(1L);
        batch.setDeletedFlag(0);
        batch.setStatus("DRAFT");
        batch.setSettleScope("APPROVED_ONLY");
        batch.setCurrencyCode("CNY");
        batch.setTargetTotalCount(0);
        batch.setEffectiveTotalCount(0);
        batch.setUserTotalCount(0);
        batch.setTotalAmount(BigDecimal.ZERO);
        batch.setCreatedAt(Instant.parse("2026-06-02T00:00:00Z"));

        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(301L);
        submission.setTaskId(101L);
        submission.setAssignmentId(401L);
        submission.setLabelerId(1001L);
        submission.setCurrentVersionId(501L);
        submission.setCurrentStatus("APPROVED");
        submission.setDeletedFlag(0);

        taskMapperStub.selectByIdResult.put(101L, task);
        batchMapperStub.selectByIdResult.put(201L, batch);
        batchMapperStub.selectOneResult = batch;
        submissionMapperStub.selectByIdResult.put(301L, submission);

        assertThatThrownBy(() -> service.recordApprovedSubmission(301L))
                .isInstanceOf(com.labelhub.core.error.BusinessException.class)
                .hasMessageContaining("奖励规则缺少 mode");
    }

    private static TaskEntity approvedRewardTask() {
        TaskEntity task = new TaskEntity();
        task.setId(101L);
        task.setTenantId(1L);
        task.setDeletedFlag(0);
        task.setTitle("Reward Task");
        task.setRewardRuleJson("{\"mode\":\"PER_APPROVED\",\"currency\":\"CNY\",\"base_amount\":5}");
        return task;
    }

    private static RewardSettlementBatchEntity draftBatch(long batchId, long taskId) {
        RewardSettlementBatchEntity batch = new RewardSettlementBatchEntity();
        batch.setId(batchId);
        batch.setTaskId(taskId);
        batch.setTenantId(1L);
        batch.setDeletedFlag(0);
        batch.setBatchNo("RB-" + taskId + "-TEST");
        batch.setStatus("DRAFT");
        batch.setSettleScope("APPROVED_ONLY");
        batch.setCurrencyCode("CNY");
        batch.setTargetTotalCount(0);
        batch.setEffectiveTotalCount(0);
        batch.setUserTotalCount(0);
        batch.setTotalAmount(BigDecimal.ZERO);
        batch.setCreatedAt(Instant.parse("2026-06-02T00:00:00Z"));
        return batch;
    }

    private static SubmissionEntity approvedSubmission(long submissionId, long taskId, long versionId) {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(submissionId);
        submission.setTaskId(taskId);
        submission.setAssignmentId(400L + submissionId);
        submission.setLabelerId(1001L);
        submission.setCurrentVersionId(versionId);
        submission.setCurrentStatus("APPROVED");
        submission.setDeletedFlag(0);
        return submission;
    }

    private Object handleUserMapper(Object proxy, Method method, Object[] args) {
        if ("selectById".equals(method.getName())) {
            Long userId = (Long) args[0];
            UserEntity user = new UserEntity();
            user.setId(userId);
            user.setDeletedFlag(0);
            user.setUsername("user" + userId);
            user.setDisplayName("User#" + userId);
            return user;
        }
        return defaultValue(method.getReturnType());
    }

    private static <T> IPage<T> pageWithRecords(Page<T> page, List<T> records) {
        page.setRecords(records);
        page.setTotal(records.size());
        return page;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] { type }, handler);
    }

    private static Object defaultValue(Class<?> returnType) {
        if (returnType == boolean.class) {
            return false;
        }
        if (returnType == int.class) {
            return 0;
        }
        if (returnType == long.class) {
            return 0L;
        }
        if (returnType == double.class) {
            return 0D;
        }
        if (returnType == float.class) {
            return 0F;
        }
        return null;
    }

    private interface PageHandler<T> {
        IPage<T> apply(Page<T> page);
    }

    private static final class MapperStub<T, M> implements InvocationHandler {
        private final Class<M> type;
        private Wrapper<T> lastWrapper;
        private List<T> selectListResult = List.of();
        private List<T> selectBatchIdsResult = List.of();
        private T selectOneResult;
        private List<Long> distinctIdsResult = List.of();
        private long selectCountResult;
        private RewardSettlementDetailEntity lastInsertedDetail;
        private PageHandler<T> selectPageHandler = page -> pageWithRecords(page, List.of());
        private RewardBatchAggregateStats aggregateStatsResult = new RewardBatchAggregateStats(0L, 0L, BigDecimal.ZERO);
        private final Map<Object, T> selectByIdResult = new HashMap<>();
        private RuntimeException insertException;
        private int insertCalls;
        private int updateStatusByBatchIdCalls;
        private Long lastUpdateStatusBatchId;
        private String lastUpdateStatus;
        private Instant lastUpdateStatusNow;
        private boolean lastKeepReversedUnchanged;
        private boolean lastSetSettledAt;
        private boolean lastSetReversedAt;
        private final M proxy;

        private MapperStub(Class<M> type) {
            this.type = type;
            this.proxy = proxy(type, this);
        }

        static <T, M> MapperStub<T, M> create(Class<M> type) {
            return new MapperStub<>(type);
        }

        boolean lastWrapperContains(SqlKeyword keyword) {
            if (!(lastWrapper instanceof AbstractWrapper<?, ?, ?> abstractWrapper)) {
                return false;
            }
            return abstractWrapper.getExpression().getNormal().stream()
                    .anyMatch(segment -> segment == keyword);
        }

        @Override
        @SuppressWarnings("unchecked")
        public Object invoke(Object proxy, Method method, Object[] args) {
            String name = method.getName();
            if ("selectPage".equals(name)) {
                lastWrapper = castWrapper(args[1]);
                return selectPageHandler.apply((Page<T>) args[0]);
            }
            if ("selectList".equals(name)) {
                lastWrapper = castWrapper(args[0]);
                return selectListResult;
            }
            if ("selectOne".equals(name)) {
                lastWrapper = castWrapper(args[0]);
                return selectOneResult;
            }
            if ("selectBatchIds".equals(name)) {
                if (args != null && args.length > 0 && args[0] instanceof Collection<?> ids) {
                    return selectBatchIdsResult.stream()
                            .filter(item -> ids.contains(readId(item)))
                            .toList();
                }
                return selectBatchIdsResult;
            }
            if ("selectById".equals(name)) {
                return selectByIdResult.get(args[0]);
            }
            if ("aggregateBatchStats".equals(name)) {
                return aggregateStatsResult;
            }
            if ("findDistinctSettledVersionIds".equals(name) || "findDistinctVersionIdsByBatchId".equals(name)) {
                return distinctIdsResult;
            }
            if ("selectCount".equals(name)) {
                lastWrapper = castWrapper(args[0]);
                return selectCountResult;
            }
            if ("updateStatusByBatchId".equals(name)) {
                updateStatusByBatchIdCalls++;
                lastUpdateStatusBatchId = (Long) args[0];
                lastUpdateStatus = (String) args[1];
                lastUpdateStatusNow = (Instant) args[2];
                lastKeepReversedUnchanged = (Boolean) args[3];
                lastSetSettledAt = (Boolean) args[4];
                lastSetReversedAt = (Boolean) args[5];
                return 1;
            }
            if ("insert".equals(name)) {
                insertCalls++;
                if (args != null && args.length > 0 && args[0] instanceof RewardSettlementDetailEntity detail) {
                    lastInsertedDetail = detail;
                }
                if (insertException != null) {
                    throw insertException;
                }
                return 1;
            }
            if ("updateById".equals(name)) {
                return 1;
            }
            if ("toString".equals(name)) {
                return type.getSimpleName() + "Stub";
            }
            if ("hashCode".equals(name)) {
                return System.identityHashCode(this);
            }
            if ("equals".equals(name)) {
                return proxy == args[0];
            }
            if (method.getDeclaringClass() == BaseMapper.class) {
                return defaultValue(method.getReturnType());
            }
            return defaultValue(method.getReturnType());
        }

        @SuppressWarnings("unchecked")
        private Wrapper<T> castWrapper(Object wrapper) {
            return (Wrapper<T>) wrapper;
        }

        private Object readId(T item) {
            try {
                Method getId = item.getClass().getMethod("getId");
                return getId.invoke(item);
            } catch (ReflectiveOperationException ex) {
                return null;
            }
        }
    }
}
