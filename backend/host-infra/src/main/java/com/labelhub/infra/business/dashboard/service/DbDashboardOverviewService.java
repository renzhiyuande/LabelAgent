package com.labelhub.infra.business.dashboard.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.AdminDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.AdminDashboardOverview;
import com.labelhub.core.business.BusinessDtos.AdminDashboardRoleShareBucket;
import com.labelhub.core.business.BusinessDtos.AdminDashboardSubmissionFunnelBucket;
import com.labelhub.core.business.BusinessDtos.AdminDashboardTaskStatusBucket;
import com.labelhub.core.business.BusinessDtos.AdminDashboardUserGrowthPoint;
import com.labelhub.core.business.BusinessDtos.AiQueueStatusCounts;
import com.labelhub.core.business.BusinessDtos.LabelerDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.LabelerDashboardOverview;
import com.labelhub.core.business.BusinessDtos.LabelerDashboardResultBucket;
import com.labelhub.core.business.BusinessDtos.LabelerDashboardTaskParticipation;
import com.labelhub.core.business.BusinessDtos.LabelerDashboardTrendPoint;
import com.labelhub.core.business.BusinessDtos.LabelerMyTaskRow;
import com.labelhub.core.business.BusinessDtos.OwnerDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.OwnerDashboardLabelerEfficiency;
import com.labelhub.core.business.BusinessDtos.OwnerDashboardOverview;
import com.labelhub.core.business.BusinessDtos.OwnerDashboardStatusBucket;
import com.labelhub.core.business.BusinessDtos.OwnerDashboardTrendPoint;
import com.labelhub.core.business.BusinessDtos.PlatformStatsOverview;
import com.labelhub.core.business.BusinessDtos.ReviewerDashboardAnalytics;
import com.labelhub.core.business.BusinessDtos.ReviewerDashboardComparisonBucket;
import com.labelhub.core.business.BusinessDtos.ReviewerDashboardDecisionBucket;
import com.labelhub.core.business.BusinessDtos.ReviewerDashboardOverview;
import com.labelhub.core.business.BusinessDtos.ReviewerDashboardTrendPoint;
import com.labelhub.core.business.BusinessDtos.RewardDetailRow;
import com.labelhub.core.business.BusinessDtos.AiReviewObservabilityDashboardSummary;
import com.labelhub.core.business.DashboardOverviewService;
import com.labelhub.core.business.LabelerWorkbenchService;
import com.labelhub.core.business.ReviewerWorkbenchService;
import com.labelhub.core.business.RewardSettlementService;
import com.labelhub.core.business.StatsService;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilitySummary;
import com.labelhub.core.review.AiReviewObservabilityQueryService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.async.AsyncTaskStatus;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.ExportJobEntity;
import com.labelhub.infra.persistence.entity.RewardSettlementBatchEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskAcceptanceRecordEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskStatsDailyEntity;
import com.labelhub.infra.persistence.entity.TaskStatsSnapshotEntity;
import com.labelhub.infra.persistence.entity.UserRoleEntity;
import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.entity.UserStatsDailyEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import com.labelhub.infra.persistence.mapper.ExportJobMapper;
import com.labelhub.infra.persistence.mapper.RewardSettlementBatchMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskAcceptanceRecordMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TaskStatsDailyMapper;
import com.labelhub.infra.persistence.mapper.TaskStatsSnapshotMapper;
import com.labelhub.infra.persistence.mapper.UserRoleMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.persistence.mapper.UserStatsDailyMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import com.labelhub.infra.system.CurrentUserContext;
import java.time.Instant;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbDashboardOverviewService implements DashboardOverviewService {
    private static final int PAGE_SIZE = 200;

    private final StatsService statsService;
    private final ReviewerWorkbenchService reviewerWorkbenchService;
    private final LabelerWorkbenchService labelerWorkbenchService;
    private final RewardSettlementService rewardSettlementService;
    private final CurrentUserContext currentUserContext;
    private final TaskMapper taskMapper;
    private final SubmissionMapper submissionMapper;
    private final TaskAcceptanceRecordMapper acceptanceRecordMapper;
    private final ExportJobMapper exportJobMapper;
    private final RewardSettlementBatchMapper rewardSettlementBatchMapper;
    private final AsyncTaskMapper asyncTaskMapper;
    private final TaskStatsSnapshotMapper taskStatsSnapshotMapper;
    private final TaskStatsDailyMapper taskStatsDailyMapper;
    private final UserStatsDailyMapper userStatsDailyMapper;
    private final UserMapper userMapper;
    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;
    private final AiReviewObservabilityQueryService aiReviewObservabilityQueryService;

    public DbDashboardOverviewService(
            StatsService statsService,
            ReviewerWorkbenchService reviewerWorkbenchService,
            LabelerWorkbenchService labelerWorkbenchService,
            RewardSettlementService rewardSettlementService,
            CurrentUserContext currentUserContext,
            TaskMapper taskMapper,
            SubmissionMapper submissionMapper,
            TaskAcceptanceRecordMapper acceptanceRecordMapper,
            ExportJobMapper exportJobMapper,
            RewardSettlementBatchMapper rewardSettlementBatchMapper,
            AsyncTaskMapper asyncTaskMapper,
            TaskStatsSnapshotMapper taskStatsSnapshotMapper,
            TaskStatsDailyMapper taskStatsDailyMapper,
            UserStatsDailyMapper userStatsDailyMapper,
            UserMapper userMapper,
            UserRoleMapper userRoleMapper,
            RoleMapper roleMapper,
            AiReviewObservabilityQueryService aiReviewObservabilityQueryService) {
        this.statsService = statsService;
        this.reviewerWorkbenchService = reviewerWorkbenchService;
        this.labelerWorkbenchService = labelerWorkbenchService;
        this.rewardSettlementService = rewardSettlementService;
        this.currentUserContext = currentUserContext;
        this.taskMapper = taskMapper;
        this.submissionMapper = submissionMapper;
        this.acceptanceRecordMapper = acceptanceRecordMapper;
        this.exportJobMapper = exportJobMapper;
        this.rewardSettlementBatchMapper = rewardSettlementBatchMapper;
        this.asyncTaskMapper = asyncTaskMapper;
        this.taskStatsSnapshotMapper = taskStatsSnapshotMapper;
        this.taskStatsDailyMapper = taskStatsDailyMapper;
        this.userStatsDailyMapper = userStatsDailyMapper;
        this.userMapper = userMapper;
        this.userRoleMapper = userRoleMapper;
        this.roleMapper = roleMapper;
        this.aiReviewObservabilityQueryService = aiReviewObservabilityQueryService;
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public AdminDashboardOverview adminOverview() {
        PlatformStatsOverview platform = statsService.platformOverview();
        AiQueueStatusCounts queueCounts = reviewerWorkbenchService.listAiQueueStatusCounts();
        return new AdminDashboardOverview(
                platform,
                countAiTasks("AI_REVIEW"),
                countAiTasks("AI_REVIEW", AsyncTaskStatus.SUCCESS),
                countAiTasks("AI_REVIEW", "FAILED", AsyncTaskStatus.DEAD_LETTER),
                countAiTasks("AI_REVIEW", AsyncTaskStatus.PENDING, AsyncTaskStatus.RUNNING),
                queueCounts.manual(),
                toDashboardSummary(aiReviewObservabilityQueryService.adminSummary()));
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public AdminDashboardAnalytics adminAnalytics() {
        PlatformStatsOverview platform = statsService.platformOverview();
        double approvalRate = platform.totalSubmissions() <= 0
                ? 0.0
                : roundOneDecimal((platform.approvedSubmissions() * 100.0) / platform.totalSubmissions());
        return new AdminDashboardAnalytics(
                approvalRate,
                aggregateAdminUserGrowthTrend(),
                aggregateAdminTaskStatusDistribution(),
                aggregateAdminSubmissionFunnel(),
                aggregateAdminRoleDistribution());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read", "business:submission:read" })
    public OwnerDashboardOverview ownerOverview() {
        List<Long> ownedTaskIds = ownedTaskIds();
        if (ownedTaskIds.isEmpty()) {
            return new OwnerDashboardOverview(0, 0, 0, 0, 0, 0, emptyAiObservabilitySummary());
        }
        return new OwnerDashboardOverview(
                countSubmissions(ownedTaskIds),
                countSubmissions(ownedTaskIds, "AI_REVIEWING", "HUMAN_REVIEWING"),
                countSubmissions(ownedTaskIds, "AI_PASSED", "APPROVED"),
                countAcceptances(ownedTaskIds, "PENDING", "SAMPLING", "REOPENED"),
                countExports(ownedTaskIds, "PENDING", "RUNNING"),
                countRewardBatches(ownedTaskIds, "DRAFT", "CONFIRMED"),
                toDashboardSummary(aiReviewObservabilityQueryService.ownerSummary()));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read", "business:submission:read" })
    public OwnerDashboardAnalytics ownerAnalytics() {
        List<Long> ownedTaskIds = ownedTaskIds();
        if (ownedTaskIds.isEmpty()) {
            return new OwnerDashboardAnalytics(0, 0, 0, 0, buildEmptyTrend(LocalDate.now().minusDays(6), LocalDate.now()), List.of(), List.of());
        }

        List<TaskStatsSnapshotEntity> snapshots = taskStatsSnapshotMapper.selectList(new LambdaQueryWrapper<TaskStatsSnapshotEntity>()
                .eq(TaskStatsSnapshotEntity::getDeletedFlag, 0)
                .in(TaskStatsSnapshotEntity::getTaskId, ownedTaskIds));
        long submissionTotal = countSubmissions(ownedTaskIds);
        long approvedTotal = countSubmissions(ownedTaskIds, "AI_PASSED", "APPROVED");
        double approvalRate = submissionTotal <= 0 ? 0.0 : roundOneDecimal((approvedTotal * 100.0) / submissionTotal);

        return new OwnerDashboardAnalytics(
                ownedTaskIds.size(),
                countDistinctLabelers(ownedTaskIds),
                approvalRate,
                averageSnapshotAiScore(snapshots),
                aggregateOwnerTrend(ownedTaskIds),
                aggregateOwnerStatusDistribution(snapshots),
                aggregateOwnerLabelerEfficiency(ownedTaskIds));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:labeler:workbench" })
    public LabelerDashboardOverview labelerOverview() {
        List<LabelerMyTaskRow> taskRows = fetchAllLabelerTasks();
        PageResponse<?> drafts = labelerWorkbenchService.listDraftSubmissions(new ParsedListQuery(1, 1, null, List.of(), List.of()));
        List<RewardDetailRow> rewardRows = fetchAllMyRewards();

        long openCount = 0;
        long pendingReviewCount = 0;
        long submittedEverCount = 0;
        long approvedCount = 0;
        long needsRevisionCount = 0;
        for (LabelerMyTaskRow row : taskRows) {
            openCount += safeLong(row.openCount());
            pendingReviewCount += safeLong(row.submittedCount());
            submittedEverCount += safeLong(row.submittedEverCount());
            approvedCount += safeLong(row.approvedCount());
            needsRevisionCount += safeLong(row.needsRevisionCount());
        }

        long paidRewardCount = 0;
        BigDecimal rewardAmountTotal = BigDecimal.ZERO;
        for (RewardDetailRow row : rewardRows) {
            rewardAmountTotal = rewardAmountTotal.add(row.amount() == null ? BigDecimal.ZERO : row.amount());
            if ("PAID".equalsIgnoreCase(row.status())) {
                paidRewardCount += 1;
            }
        }

        return new LabelerDashboardOverview(
                taskRows.size(),
                openCount,
                pendingReviewCount,
                submittedEverCount,
                approvedCount,
                needsRevisionCount,
                drafts.total(),
                rewardRows.size(),
                paidRewardCount,
                rewardAmountTotal.doubleValue());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:labeler:workbench" })
    public LabelerDashboardAnalytics labelerAnalytics() {
        Long userId = currentUserContext.requireUserId();
        LocalDate today = LocalDate.now();
        LocalDate trendFrom = today.minusDays(6);
        LocalDate summaryFrom = today.minusDays(13);

        List<UserStatsDailyEntity> selfRows = userStatsDailyMapper.selectList(new LambdaQueryWrapper<UserStatsDailyEntity>()
                .eq(UserStatsDailyEntity::getDeletedFlag, 0)
                .eq(UserStatsDailyEntity::getRoleCode, "LABELER")
                .eq(UserStatsDailyEntity::getUserId, userId)
                .between(UserStatsDailyEntity::getStatDate, summaryFrom, today)
                .orderByAsc(UserStatsDailyEntity::getStatDate));
        List<UserStatsDailyEntity> platformRows = userStatsDailyMapper.selectList(new LambdaQueryWrapper<UserStatsDailyEntity>()
                .eq(UserStatsDailyEntity::getDeletedFlag, 0)
                .eq(UserStatsDailyEntity::getRoleCode, "LABELER")
                .between(UserStatsDailyEntity::getStatDate, trendFrom, today)
                .orderByAsc(UserStatsDailyEntity::getStatDate));
        List<LabelerMyTaskRow> taskRows = fetchAllLabelerTasks();
        List<RewardDetailRow> rewardRows = fetchAllMyRewards();

        Map<LocalDate, LabelerTrendAccumulator> trendPoints = buildLabelerTrendMap(trendFrom, today);
        Map<LocalDate, WeightedAverageAccumulator> baselinePoints = buildWeightedAverageMap(trendFrom, today);

        long approvedTotal = 0;
        long rejectedTotal = 0;
        long returnedTotal = 0;
        WeightedAverageAccumulator qualitySummary = new WeightedAverageAccumulator();

        for (UserStatsDailyEntity row : selfRows) {
            if (!row.getStatDate().isBefore(trendFrom)) {
                LabelerTrendAccumulator accumulator = trendPoints.get(row.getStatDate());
                if (accumulator != null) {
                    accumulator.submittedCount += safeLong(row.getSubmitCount());
                    accumulator.approvedCount += safeLong(row.getApproveCount());
                    accumulator.needsRevisionCount += safeLong(row.getRejectCount()) + safeLong(row.getReturnCount());
                    accumulator.quality.add(row.getQualityScoreAvg(), safeLong(row.getSubmitCount()));
                }
            }
            approvedTotal += safeLong(row.getApproveCount());
            rejectedTotal += safeLong(row.getRejectCount());
            returnedTotal += safeLong(row.getReturnCount());
            qualitySummary.add(row.getQualityScoreAvg(), safeLong(row.getSubmitCount()));
        }

        for (UserStatsDailyEntity row : platformRows) {
            WeightedAverageAccumulator accumulator = baselinePoints.get(row.getStatDate());
            if (accumulator != null) {
                accumulator.add(row.getQualityScoreAvg(), safeLong(row.getSubmitCount()));
            }
        }

        long todaySubmittedCount = trendPoints.getOrDefault(today, new LabelerTrendAccumulator()).submittedCount;
        BigDecimal rewardAmountTotal = rewardRows.stream()
                .map(RewardDetailRow::amount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<LabelerDashboardTrendPoint> trend = trendPoints.entrySet().stream()
                .map(entry -> entry.getValue().toPoint(entry.getKey(), baselinePoints.get(entry.getKey())))
                .toList();

        List<LabelerDashboardResultBucket> resultDistribution = new ArrayList<>();
        if (approvedTotal > 0) {
            resultDistribution.add(new LabelerDashboardResultBucket("已通过", approvedTotal));
        }
        if (rejectedTotal > 0) {
            resultDistribution.add(new LabelerDashboardResultBucket("已驳回", rejectedTotal));
        }
        if (returnedTotal > 0) {
            resultDistribution.add(new LabelerDashboardResultBucket("待修改", returnedTotal));
        }

        List<LabelerDashboardTaskParticipation> participation = taskRows.stream()
                .sorted(Comparator
                        .comparingLong((LabelerMyTaskRow row) -> safeLong(row.submittedEverCount()))
                        .reversed()
                        .thenComparing(Comparator.comparingLong((LabelerMyTaskRow row) -> safeLong(row.openCount())).reversed())
                        .thenComparing(LabelerMyTaskRow::taskId))
                .limit(6)
                .map(row -> new LabelerDashboardTaskParticipation(
                        row.taskId(),
                        row.taskName(),
                        safeLong(row.openCount()),
                        safeLong(row.submittedEverCount()),
                        safeLong(row.approvedCount()),
                        safeLong(row.needsRevisionCount()),
                        row.deadlineAt()))
                .toList();

        return new LabelerDashboardAnalytics(
                todaySubmittedCount,
                taskRows.size(),
                qualitySummary.value(),
                rewardAmountTotal.doubleValue(),
                trend,
                resultDistribution,
                participation);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:reviewer:workbench" })
    public ReviewerDashboardOverview reviewerOverview() {
        AiQueueStatusCounts queueCounts = reviewerWorkbenchService.listAiQueueStatusCounts();
        long auditPoolPendingCount = reviewerWorkbenchService.getAuditPoolMeta(null).levels().stream()
                .mapToLong(level -> safeLong(level.pendingCount()))
                .sum();
        long reviewRecordTotal = reviewerWorkbenchService.listReviewRecords(
                new ParsedListQuery(1, 1, null, List.of(), List.of()),
                null,
                null,
                null,
                null,
                null).total();
        return new ReviewerDashboardOverview(
                queueCounts.all(),
                queueCounts.pending(),
                queueCounts.manual(),
                queueCounts.failed(),
                auditPoolPendingCount,
                reviewRecordTotal);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:reviewer:workbench" })
    public ReviewerDashboardAnalytics reviewerAnalytics() {
        Long userId = currentUserContext.requireUserId();
        LocalDate today = LocalDate.now();
        LocalDate trendFrom = today.minusDays(6);
        LocalDate summaryFrom = today.minusDays(13);

        List<UserStatsDailyEntity> selfRows = userStatsDailyMapper.selectList(new LambdaQueryWrapper<UserStatsDailyEntity>()
                .eq(UserStatsDailyEntity::getDeletedFlag, 0)
                .eq(UserStatsDailyEntity::getRoleCode, "REVIEWER")
                .eq(UserStatsDailyEntity::getUserId, userId)
                .between(UserStatsDailyEntity::getStatDate, summaryFrom, today)
                .orderByAsc(UserStatsDailyEntity::getStatDate));
        List<UserStatsDailyEntity> teamRows = userStatsDailyMapper.selectList(new LambdaQueryWrapper<UserStatsDailyEntity>()
                .eq(UserStatsDailyEntity::getDeletedFlag, 0)
                .eq(UserStatsDailyEntity::getRoleCode, "REVIEWER")
                .between(UserStatsDailyEntity::getStatDate, summaryFrom, today)
                .orderByAsc(UserStatsDailyEntity::getStatDate));

        Map<LocalDate, ReviewerTrendAccumulator> trendPoints = buildReviewerTrendMap(trendFrom, today);
        long approvedTotal = 0;
        long rejectedTotal = 0;
        long returnedTotal = 0;
        WeightedAverageAccumulator latencySummary = new WeightedAverageAccumulator();

        for (UserStatsDailyEntity row : selfRows) {
            long approved = safeLong(row.getApproveCount());
            long rejected = safeLong(row.getRejectCount());
            long returned = safeLong(row.getReturnCount());
            long decisionCount = approved + rejected + returned;
            if (!row.getStatDate().isBefore(trendFrom)) {
                ReviewerTrendAccumulator accumulator = trendPoints.get(row.getStatDate());
                if (accumulator != null) {
                    accumulator.approvedCount += approved;
                    accumulator.rejectedCount += rejected;
                    accumulator.returnedCount += returned;
                    accumulator.latency.add(secondsToMinutes(row.getAvgReviewLatencySec()), decisionCount);
                }
            }
            approvedTotal += approved;
            rejectedTotal += rejected;
            returnedTotal += returned;
            latencySummary.add(secondsToMinutes(row.getAvgReviewLatencySec()), decisionCount);
        }

        long todayReviewedCount = trendPoints.getOrDefault(today, new ReviewerTrendAccumulator()).decisionCount();
        long totalDecisions = approvedTotal + rejectedTotal + returnedTotal;
        double approvalRate = totalDecisions <= 0 ? 0.0 : roundOneDecimal((approvedTotal * 100.0) / totalDecisions);

        List<ReviewerDashboardDecisionBucket> decisionDistribution = new ArrayList<>();
        if (approvedTotal > 0) {
            decisionDistribution.add(new ReviewerDashboardDecisionBucket("通过", approvedTotal));
        }
        if (rejectedTotal > 0) {
            decisionDistribution.add(new ReviewerDashboardDecisionBucket("驳回", rejectedTotal));
        }
        if (returnedTotal > 0) {
            decisionDistribution.add(new ReviewerDashboardDecisionBucket("打回", returnedTotal));
        }

        List<ReviewerDashboardComparisonBucket> comparison = List.of(
                buildReviewerComparisonBucket("今日", today, today, userId, teamRows),
                buildReviewerComparisonBucket("近 7 天", trendFrom, today, userId, teamRows),
                buildReviewerComparisonBucket("近 14 天", summaryFrom, today, userId, teamRows));

        return new ReviewerDashboardAnalytics(
                todayReviewedCount,
                approvalRate,
                latencySummary.value(),
                trendPoints.entrySet().stream().map(entry -> entry.getValue().toPoint(entry.getKey())).toList(),
                decisionDistribution,
                comparison);
    }

    private List<Long> ownedTaskIds() {
        Long userId = currentUserContext.requireUserId();
        LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskEntity::getDeletedFlag, 0)
                .eq(TaskEntity::getOwnerId, userId)
                .select(TaskEntity::getId);
        return taskMapper.selectList(wrapper).stream()
                .map(TaskEntity::getId)
                .toList();
    }

    private long countSubmissions(List<Long> taskIds, String... statuses) {
        LambdaQueryWrapper<SubmissionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionEntity::getDeletedFlag, 0)
                .in(SubmissionEntity::getTaskId, taskIds);
        if (statuses.length > 0) {
            wrapper.in(SubmissionEntity::getCurrentStatus, List.of(statuses));
        }
        return submissionMapper.selectCount(wrapper);
    }

    private long countAcceptances(List<Long> taskIds, String... statuses) {
        LambdaQueryWrapper<TaskAcceptanceRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskAcceptanceRecordEntity::getDeletedFlag, 0)
                .in(TaskAcceptanceRecordEntity::getTaskId, taskIds);
        if (statuses.length > 0) {
            wrapper.in(TaskAcceptanceRecordEntity::getStatus, List.of(statuses));
        }
        return acceptanceRecordMapper.selectCount(wrapper);
    }

    private long countExports(List<Long> taskIds, String... statuses) {
        LambdaQueryWrapper<ExportJobEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ExportJobEntity::getDeletedFlag, 0)
                .in(ExportJobEntity::getTaskId, taskIds);
        if (statuses.length > 0) {
            wrapper.in(ExportJobEntity::getStatus, List.of(statuses));
        }
        return exportJobMapper.selectCount(wrapper);
    }

    private long countRewardBatches(List<Long> taskIds, String... statuses) {
        LambdaQueryWrapper<RewardSettlementBatchEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RewardSettlementBatchEntity::getDeletedFlag, 0)
                .in(RewardSettlementBatchEntity::getTaskId, taskIds);
        if (statuses.length > 0) {
            wrapper.in(RewardSettlementBatchEntity::getStatus, List.of(statuses));
        }
        return rewardSettlementBatchMapper.selectCount(wrapper);
    }

    private long countAiTasks(String taskType, String... statuses) {
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                .eq(AsyncTaskEntity::getTaskType, taskType);
        if (statuses.length > 0) {
            wrapper.in(AsyncTaskEntity::getStatus, List.of(statuses));
        }
        return asyncTaskMapper.selectCount(wrapper);
    }

    private List<LabelerMyTaskRow> fetchAllLabelerTasks() {
        return fetchLabelerTaskPage(1, new ArrayList<>());
    }

    private List<LabelerMyTaskRow> fetchLabelerTaskPage(int page, List<LabelerMyTaskRow> acc) {
        PageResponse<LabelerMyTaskRow> response = labelerWorkbenchService.listMyTasks(
                new ParsedListQuery(page, PAGE_SIZE, null, List.of(), List.of()));
        acc.addAll(response.list());
        if (acc.size() < response.total()) {
            return fetchLabelerTaskPage(page + 1, acc);
        }
        return acc;
    }

    private List<RewardDetailRow> fetchAllMyRewards() {
        return fetchRewardPage(1, new ArrayList<>());
    }

    private List<RewardDetailRow> fetchRewardPage(int page, List<RewardDetailRow> acc) {
        PageResponse<RewardDetailRow> response = rewardSettlementService.listMyRewards(
                new ParsedListQuery(page, PAGE_SIZE, null, List.of(), List.of()));
        acc.addAll(response.list());
        if (acc.size() < response.total()) {
            return fetchRewardPage(page + 1, acc);
        }
        return acc;
    }

    private long countDistinctLabelers(List<Long> taskIds) {
        LambdaQueryWrapper<SubmissionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionEntity::getDeletedFlag, 0)
                .in(SubmissionEntity::getTaskId, taskIds)
                .select(SubmissionEntity::getLabelerId);
        return submissionMapper.selectList(wrapper).stream()
                .map(SubmissionEntity::getLabelerId)
                .filter(labelerId -> labelerId != null && labelerId > 0)
                .distinct()
                .count();
    }

    private double averageSnapshotAiScore(List<TaskStatsSnapshotEntity> snapshots) {
        double total = 0.0;
        int count = 0;
        for (TaskStatsSnapshotEntity snapshot : snapshots) {
            if (snapshot.getAvgAiScore() == null) {
                continue;
            }
            total += snapshot.getAvgAiScore().doubleValue();
            count += 1;
        }
        return count == 0 ? 0.0 : roundOneDecimal(total / count);
    }

    private List<OwnerDashboardTrendPoint> buildEmptyTrend(LocalDate from, LocalDate to) {
        Map<LocalDate, OwnerTrendAccumulator> points = new LinkedHashMap<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            points.put(cursor, new OwnerTrendAccumulator());
            cursor = cursor.plusDays(1);
        }
        return points.entrySet().stream()
                .map(entry -> entry.getValue().toPoint(entry.getKey()))
                .toList();
    }

    private List<OwnerDashboardTrendPoint> aggregateOwnerTrend(List<Long> ownedTaskIds) {
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(6);
        Map<LocalDate, OwnerTrendAccumulator> points = new LinkedHashMap<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            points.put(cursor, new OwnerTrendAccumulator());
            cursor = cursor.plusDays(1);
        }

        List<TaskStatsDailyEntity> rows = taskStatsDailyMapper.selectList(new LambdaQueryWrapper<TaskStatsDailyEntity>()
                .eq(TaskStatsDailyEntity::getDeletedFlag, 0)
                .in(TaskStatsDailyEntity::getTaskId, ownedTaskIds)
                .between(TaskStatsDailyEntity::getStatDate, from, to)
                .orderByAsc(TaskStatsDailyEntity::getStatDate));
        for (TaskStatsDailyEntity row : rows) {
            OwnerTrendAccumulator accumulator = points.get(row.getStatDate());
            if (accumulator == null) {
                continue;
            }
            accumulator.submittedCount += safeLong(row.getSubmitCount());
            accumulator.approvedCount += safeLong(row.getApproveCount());
            accumulator.needsRevisionCount += safeLong(row.getRevisionCount()) + safeLong(row.getAiRejectCount());
            if (row.getAvgAiScore() != null) {
                long weight = Math.max(1L, safeLong(row.getSubmitCount()) + safeLong(row.getApproveCount()));
                accumulator.aiScoreWeight += weight;
                accumulator.aiScoreSum += row.getAvgAiScore().doubleValue() * weight;
            }
        }
        return points.entrySet().stream()
                .map(entry -> entry.getValue().toPoint(entry.getKey()))
                .toList();
    }

    private List<OwnerDashboardStatusBucket> aggregateOwnerStatusDistribution(List<TaskStatsSnapshotEntity> snapshots) {
        long inProgress = 0;
        long reviewPending = 0;
        long needsRevision = 0;
        long approved = 0;
        for (TaskStatsSnapshotEntity snapshot : snapshots) {
            inProgress += safeLong(snapshot.getInProgressCount());
            reviewPending += safeLong(snapshot.getSubmittedCount())
                    + safeLong(snapshot.getAiReviewingCount())
                    + safeLong(snapshot.getHumanReviewingCount());
            needsRevision += safeLong(snapshot.getNeedsRevisionCount()) + safeLong(snapshot.getAiRejectedCount());
            approved += safeLong(snapshot.getApprovedCount());
        }
        List<OwnerDashboardStatusBucket> buckets = new ArrayList<>();
        if (inProgress > 0) {
            buckets.add(new OwnerDashboardStatusBucket("进行中", inProgress));
        }
        if (reviewPending > 0) {
            buckets.add(new OwnerDashboardStatusBucket("待审核", reviewPending));
        }
        if (needsRevision > 0) {
            buckets.add(new OwnerDashboardStatusBucket("待修改", needsRevision));
        }
        if (approved > 0) {
            buckets.add(new OwnerDashboardStatusBucket("已通过", approved));
        }
        return buckets;
    }

    private List<OwnerDashboardLabelerEfficiency> aggregateOwnerLabelerEfficiency(List<Long> ownedTaskIds) {
        LocalDate from = LocalDate.now().minusDays(13);
        LocalDate to = LocalDate.now();
        List<UserStatsDailyEntity> rows = userStatsDailyMapper.selectList(new LambdaQueryWrapper<UserStatsDailyEntity>()
                .eq(UserStatsDailyEntity::getDeletedFlag, 0)
                .eq(UserStatsDailyEntity::getRoleCode, "LABELER")
                .in(UserStatsDailyEntity::getTaskId, ownedTaskIds)
                .between(UserStatsDailyEntity::getStatDate, from, to));
        if (rows.isEmpty()) {
            return List.of();
        }

        Map<Long, OwnerLabelerAccumulator> byUser = new LinkedHashMap<>();
        for (UserStatsDailyEntity row : rows) {
            if (row.getUserId() == null) {
                continue;
            }
            OwnerLabelerAccumulator accumulator = byUser.computeIfAbsent(row.getUserId(), ignored -> new OwnerLabelerAccumulator());
            accumulator.submitCount += safeLong(row.getSubmitCount());
            if (row.getQualityScoreAvg() != null) {
                long weight = Math.max(1L, safeLong(row.getSubmitCount()));
                accumulator.qualityWeight += weight;
                accumulator.qualitySum += row.getQualityScoreAvg().doubleValue() * weight;
            }
        }

        Map<Long, String> displayNames = new LinkedHashMap<>();
        if (!byUser.isEmpty()) {
            userMapper.selectBatchIds(byUser.keySet()).stream()
                    .filter(UserEntity.class::isInstance)
                    .map(UserEntity.class::cast)
                    .forEach(user -> displayNames.put(user.getId(), user.getDisplayName() != null && !user.getDisplayName().isBlank()
                            ? user.getDisplayName()
                            : user.getUsername()));
        }

        return byUser.entrySet().stream()
                .sorted(Comparator
                        .comparingLong((Map.Entry<Long, OwnerLabelerAccumulator> entry) -> entry.getValue().submitCount)
                        .reversed()
                        .thenComparing(Map.Entry::getKey))
                .limit(6)
                .map(entry -> new OwnerDashboardLabelerEfficiency(
                        entry.getKey(),
                        displayNames.getOrDefault(entry.getKey(), "标注员 " + entry.getKey()),
                        entry.getValue().submitCount,
                        entry.getValue().qualityScore()))
                .toList();
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private List<AdminDashboardUserGrowthPoint> aggregateAdminUserGrowthTrend() {
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(6);
        Map<LocalDate, Long> newUsersByDate = new LinkedHashMap<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            newUsersByDate.put(cursor, 0L);
            cursor = cursor.plusDays(1);
        }

        List<UserEntity> users = userMapper.selectList(new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getDeletedFlag, 0)
                .orderByAsc(UserEntity::getCreatedAt));

        long cumulativeBeforeWindow = 0;
        for (UserEntity user : users) {
            LocalDate createdDate = toLocalDate(user.getCreatedAt());
            if (createdDate == null) {
                continue;
            }
            if (createdDate.isBefore(from)) {
                cumulativeBeforeWindow += 1;
                continue;
            }
            if (!createdDate.isAfter(to)) {
                newUsersByDate.computeIfPresent(createdDate, (ignored, current) -> current + 1);
            }
        }

        List<AdminDashboardUserGrowthPoint> trend = new ArrayList<>();
        long cumulative = cumulativeBeforeWindow;
        for (Map.Entry<LocalDate, Long> entry : newUsersByDate.entrySet()) {
            cumulative += entry.getValue();
            trend.add(new AdminDashboardUserGrowthPoint(entry.getKey().toString(), entry.getValue(), cumulative));
        }
        return trend;
    }

    private List<AdminDashboardTaskStatusBucket> aggregateAdminTaskStatusDistribution() {
        List<TaskEntity> tasks = taskMapper.selectList(new LambdaQueryWrapper<TaskEntity>()
                .eq(TaskEntity::getDeletedFlag, 0)
                .orderByAsc(TaskEntity::getId));
        Map<String, Long> counts = new LinkedHashMap<>();
        for (TaskEntity task : tasks) {
            String key = normalizeTaskStatus(task.getStatus());
            counts.put(key, counts.getOrDefault(key, 0L) + 1);
        }
        return counts.entrySet().stream()
                .map(entry -> new AdminDashboardTaskStatusBucket(entry.getKey(), entry.getValue()))
                .toList();
    }

    private List<AdminDashboardSubmissionFunnelBucket> aggregateAdminSubmissionFunnel() {
        List<SubmissionEntity> submissions = submissionMapper.selectList(new LambdaQueryWrapper<SubmissionEntity>()
                .eq(SubmissionEntity::getDeletedFlag, 0)
                .orderByAsc(SubmissionEntity::getId));
        long submittedTotal = submissions.size();
        long aiReviewing = 0;
        long humanReviewing = 0;
        long needsRevision = 0;
        long approved = 0;
        for (SubmissionEntity submission : submissions) {
            String status = String.valueOf(submission.getCurrentStatus());
            if ("AI_REVIEWING".equalsIgnoreCase(status)) {
                aiReviewing += 1;
            } else if ("HUMAN_REVIEWING".equalsIgnoreCase(status)) {
                humanReviewing += 1;
            } else if ("AI_REJECTED".equalsIgnoreCase(status)
                    || "REVISION_REQUIRED".equalsIgnoreCase(status)
                    || "RETURNED".equalsIgnoreCase(status)
                    || "REJECTED".equalsIgnoreCase(status)) {
                needsRevision += 1;
            } else if ("AI_PASSED".equalsIgnoreCase(status) || "APPROVED".equalsIgnoreCase(status)) {
                approved += 1;
            }
        }
        return List.of(
                new AdminDashboardSubmissionFunnelBucket("提交总量", submittedTotal),
                new AdminDashboardSubmissionFunnelBucket("AI 预审中", aiReviewing),
                new AdminDashboardSubmissionFunnelBucket("人工审核中", humanReviewing),
                new AdminDashboardSubmissionFunnelBucket("待修改", needsRevision),
                new AdminDashboardSubmissionFunnelBucket("已通过", approved));
    }

    private List<AdminDashboardRoleShareBucket> aggregateAdminRoleDistribution() {
        List<UserRoleEntity> userRoles = userRoleMapper.selectList(new LambdaQueryWrapper<UserRoleEntity>()
                .eq(UserRoleEntity::getDeletedFlag, 0));
        Map<Long, String> roleCodes = new LinkedHashMap<>();
        Map<Long, String> roleNames = new LinkedHashMap<>();
        roleMapper.selectList(new LambdaQueryWrapper<RoleEntity>()
                .eq(RoleEntity::getDeletedFlag, 0)).forEach(role -> {
            roleCodes.put(role.getId(), role.getRoleCode());
            roleNames.put(role.getId(), role.getRoleName());
        });

        Map<Long, Set<Long>> usersByRole = new LinkedHashMap<>();
        for (UserRoleEntity userRole : userRoles) {
            if (!isActiveUserRole(userRole)) {
                continue;
            }
            usersByRole.computeIfAbsent(userRole.getRoleId(), ignored -> new java.util.LinkedHashSet<>()).add(userRole.getUserId());
        }

        return usersByRole.entrySet().stream()
                .sorted(Comparator.comparingLong((Map.Entry<Long, Set<Long>> entry) -> entry.getValue().size()).reversed())
                .map(entry -> new AdminDashboardRoleShareBucket(
                        roleCodes.getOrDefault(entry.getKey(), "UNKNOWN"),
                        roleNames.getOrDefault(entry.getKey(), "未知角色"),
                        entry.getValue().size()))
                .toList();
    }

    private double secondsToMinutes(Integer seconds) {
        return seconds == null || seconds <= 0 ? 0.0 : seconds / 60.0;
    }

    private long safeLong(Number value) {
        return value == null ? 0L : value.longValue();
    }

    private LocalDate toLocalDate(Instant instant) {
        return instant == null ? null : instant.atZone(ZoneId.systemDefault()).toLocalDate();
    }

    private boolean isActiveUserRole(UserRoleEntity userRole) {
        Instant now = Instant.now();
        if (userRole.getEffectiveAt() != null && userRole.getEffectiveAt().isAfter(now)) {
            return false;
        }
        return userRole.getExpiredAt() == null || userRole.getExpiredAt().isAfter(now);
    }

    private String normalizeTaskStatus(String status) {
        if (status == null || status.isBlank()) {
            return "UNKNOWN";
        }
        return switch (status) {
            case "PUBLISHED" -> "已发布";
            case "DRAFT" -> "草稿";
            case "ARCHIVED" -> "已归档";
            case "PAUSED" -> "已暂停";
            case "FINISHED" -> "已完成";
            default -> status;
        };
    }

    private Map<LocalDate, LabelerTrendAccumulator> buildLabelerTrendMap(LocalDate from, LocalDate to) {
        Map<LocalDate, LabelerTrendAccumulator> points = new LinkedHashMap<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            points.put(cursor, new LabelerTrendAccumulator());
            cursor = cursor.plusDays(1);
        }
        return points;
    }

    private Map<LocalDate, WeightedAverageAccumulator> buildWeightedAverageMap(LocalDate from, LocalDate to) {
        Map<LocalDate, WeightedAverageAccumulator> points = new LinkedHashMap<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            points.put(cursor, new WeightedAverageAccumulator());
            cursor = cursor.plusDays(1);
        }
        return points;
    }

    private Map<LocalDate, ReviewerTrendAccumulator> buildReviewerTrendMap(LocalDate from, LocalDate to) {
        Map<LocalDate, ReviewerTrendAccumulator> points = new LinkedHashMap<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            points.put(cursor, new ReviewerTrendAccumulator());
            cursor = cursor.plusDays(1);
        }
        return points;
    }

    private ReviewerDashboardComparisonBucket buildReviewerComparisonBucket(
            String scopeLabel,
            LocalDate from,
            LocalDate to,
            Long currentUserId,
            List<UserStatsDailyEntity> teamRows) {
        long personalCount = 0;
        long teamCount = 0;
        Set<Long> activeReviewerIds = new java.util.LinkedHashSet<>();
        for (UserStatsDailyEntity row : teamRows) {
            if (row.getStatDate().isBefore(from) || row.getStatDate().isAfter(to)) {
                continue;
            }
            long decisionCount = safeLong(row.getApproveCount()) + safeLong(row.getRejectCount()) + safeLong(row.getReturnCount());
            teamCount += decisionCount;
            if (decisionCount > 0 && row.getUserId() != null) {
                activeReviewerIds.add(row.getUserId());
            }
            if (row.getUserId() != null && row.getUserId().equals(currentUserId)) {
                personalCount += decisionCount;
            }
        }
        double teamAverageCount = activeReviewerIds.isEmpty() ? 0.0 : roundOneDecimal(teamCount * 1.0 / activeReviewerIds.size());
        return new ReviewerDashboardComparisonBucket(scopeLabel, personalCount, teamAverageCount);
    }

    private static final class OwnerTrendAccumulator {
        private long submittedCount;
        private long approvedCount;
        private long needsRevisionCount;
        private double aiScoreSum;
        private long aiScoreWeight;

        private OwnerDashboardTrendPoint toPoint(LocalDate statDate) {
            double avgAiScore = aiScoreWeight <= 0 ? 0.0 : Math.round((aiScoreSum / aiScoreWeight) * 10.0) / 10.0;
            return new OwnerDashboardTrendPoint(
                    statDate.toString(),
                    submittedCount,
                    approvedCount,
                    needsRevisionCount,
                    avgAiScore);
        }
    }

    private static final class OwnerLabelerAccumulator {
        private long submitCount;
        private double qualitySum;
        private long qualityWeight;

        private double qualityScore() {
            return qualityWeight <= 0 ? 0.0 : Math.round((qualitySum / qualityWeight) * 10.0) / 10.0;
        }
    }

    private final class LabelerTrendAccumulator {
        private long submittedCount;
        private long approvedCount;
        private long needsRevisionCount;
        private final WeightedAverageAccumulator quality = new WeightedAverageAccumulator();

        private LabelerDashboardTrendPoint toPoint(LocalDate statDate, WeightedAverageAccumulator baseline) {
            return new LabelerDashboardTrendPoint(
                    statDate.toString(),
                    submittedCount,
                    approvedCount,
                    needsRevisionCount,
                    quality.value(),
                    baseline == null ? 0.0 : baseline.value());
        }
    }

    private final class ReviewerTrendAccumulator {
        private long approvedCount;
        private long rejectedCount;
        private long returnedCount;
        private final WeightedAverageAccumulator latency = new WeightedAverageAccumulator();

        private long decisionCount() {
            return approvedCount + rejectedCount + returnedCount;
        }

        private ReviewerDashboardTrendPoint toPoint(LocalDate statDate) {
            return new ReviewerDashboardTrendPoint(
                    statDate.toString(),
                    approvedCount,
                    rejectedCount,
                    returnedCount,
                    latency.value());
        }
    }

    private final class WeightedAverageAccumulator {
        private double weightedSum;
        private long weight;

        private void add(Number value, long nextWeight) {
            if (value == null) {
                return;
            }
            long safeWeight = Math.max(1L, nextWeight);
            weightedSum += value.doubleValue() * safeWeight;
            weight += safeWeight;
        }

        private double value() {
            return weight <= 0 ? 0.0 : roundOneDecimal(weightedSum / weight);
        }
    }

    private static AiReviewObservabilityDashboardSummary toDashboardSummary(AiReviewObservabilitySummary summary) {
        if (summary == null) {
            return emptyAiObservabilitySummary();
        }
        return new AiReviewObservabilityDashboardSummary(
                summary.queuePending(),
                summary.queueRunning(),
                summary.reviewsLastHour(),
                summary.reviewsLast24Hours(),
                summary.failedLast24Hours(),
                summary.failureRateLast24Hours(),
                summary.avgLatencyMsLast24Hours(),
                summary.totalTokensLast24Hours(),
                summary.attentionCount());
    }

    private static AiReviewObservabilityDashboardSummary emptyAiObservabilitySummary() {
        return new AiReviewObservabilityDashboardSummary(0, 0, 0, 0, 0, 0.0, 0.0, 0, 0);
    }
}
