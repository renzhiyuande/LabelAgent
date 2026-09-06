package com.labelhub.infra.business.review.observability;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.review.AiReviewLlmAttempt;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewModelBucket;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityOverview;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityRecordDetail;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityRecordPage;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityRecordSummary;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilitySummary;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewThroughputPoint;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewTimelineEntry;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewTopKItem;
import com.labelhub.core.review.AiReviewObservabilityQueryService;
import com.labelhub.infra.async.AsyncTaskStatus;
import com.labelhub.infra.persistence.entity.AiReviewLlmAttemptEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.SubmissionStatusHistoryEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.AiReviewLlmAttemptMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.business.llm.support.LlmModelCostResolver;
import com.labelhub.infra.persistence.entity.LlmModelEntity;
import com.labelhub.infra.persistence.mapper.SubmissionStatusHistoryMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.system.CurrentUserContext;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbAiReviewObservabilityQueryService implements AiReviewObservabilityQueryService {
    private static final int DEFAULT_TREND_HOURS = 24;
    private static final int TOP_K = 10;
    private static final DateTimeFormatter BUCKET_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:00");

    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final AiReviewLlmAttemptMapper aiReviewLlmAttemptMapper;
    private final AsyncTaskMapper asyncTaskMapper;
    private final TaskMapper taskMapper;
    private final SubmissionMapper submissionMapper;
    private final SubmissionStatusHistoryMapper submissionStatusHistoryMapper;
    private final CurrentUserContext currentUserContext;
    private final LlmModelCostResolver llmModelCostResolver;

    public DbAiReviewObservabilityQueryService(
            AiReviewRecordMapper aiReviewRecordMapper,
            AiReviewLlmAttemptMapper aiReviewLlmAttemptMapper,
            AsyncTaskMapper asyncTaskMapper,
            TaskMapper taskMapper,
            SubmissionMapper submissionMapper,
            SubmissionStatusHistoryMapper submissionStatusHistoryMapper,
            CurrentUserContext currentUserContext,
            LlmModelCostResolver llmModelCostResolver) {
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.aiReviewLlmAttemptMapper = aiReviewLlmAttemptMapper;
        this.asyncTaskMapper = asyncTaskMapper;
        this.taskMapper = taskMapper;
        this.submissionMapper = submissionMapper;
        this.submissionStatusHistoryMapper = submissionStatusHistoryMapper;
        this.currentUserContext = currentUserContext;
        this.llmModelCostResolver = llmModelCostResolver;
    }

    @Override
    public AiReviewObservabilityOverview adminOverview(int trendHours) {
        return buildOverview(null, normalizeTrendHours(trendHours), true);
    }

    @Override
    public AiReviewObservabilityRecordPage adminRecords(
            int page, int size, Long taskId, String status, String modelId, String verdict) {
        return pageRecords(null, page, size, taskId, status, modelId, verdict, true);
    }

    @Override
    public AiReviewObservabilityRecordDetail adminRecordDetail(Long aiReviewId) {
        return recordDetail(aiReviewId, null, true);
    }

    @Override
    public AiReviewObservabilityOverview ownerOverview(int trendHours) {
        List<Long> ownedTaskIds = ownedTaskIds();
        if (ownedTaskIds.isEmpty()) {
            return emptyOverview(false);
        }
        return buildOverview(ownedTaskIds, normalizeTrendHours(trendHours), false);
    }

    @Override
    public AiReviewObservabilityRecordPage ownerRecords(
            int page, int size, Long taskId, String status, String modelId, String verdict) {
        List<Long> ownedTaskIds = ownedTaskIds();
        if (ownedTaskIds.isEmpty()) {
            return new AiReviewObservabilityRecordPage(PageResponse.of(0, page, size, List.of()));
        }
        if (taskId != null && !ownedTaskIds.contains(taskId)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN, "Task not owned by current user");
        }
        return pageRecords(ownedTaskIds, page, size, taskId, status, null, verdict, false);
    }

    @Override
    public AiReviewObservabilityRecordDetail ownerRecordDetail(Long aiReviewId) {
        return recordDetail(aiReviewId, ownedTaskIds(), false);
    }

    @Override
    public AiReviewObservabilitySummary adminSummary() {
        return buildSummary(null);
    }

    @Override
    public AiReviewObservabilitySummary ownerSummary() {
        List<Long> ownedTaskIds = ownedTaskIds();
        if (ownedTaskIds.isEmpty()) {
            return redactOperationalSummary(emptySummary());
        }
        return redactOperationalSummary(buildSummary(ownedTaskIds));
    }

    private AiReviewObservabilityOverview buildOverview(List<Long> taskScope, int trendHours, boolean includeSensitive) {
        Instant now = Instant.now();
        Instant from = now.minusSeconds(trendHours * 3600L);
        List<AiReviewRecordEntity> recent = listRecordsSince(taskScope, from);
        AiReviewObservabilitySummary summary = includeSensitive
                ? buildSummary(taskScope)
                : redactOperationalSummary(buildSummary(taskScope));
        return new AiReviewObservabilityOverview(
                summary,
                buildThroughputTrend(recent, trendHours),
                includeSensitive ? buildModelDistribution(recent) : List.of(),
                topSlow(recent, includeSensitive),
                topFailed(recent, includeSensitive),
                topRetry(recent, includeSensitive));
    }

    private AiReviewObservabilitySummary buildSummary(List<Long> taskScope) {
        Instant now = Instant.now();
        Instant hourAgo = now.minusSeconds(3600);
        Instant dayAgo = now.minusSeconds(86400);
        List<AiReviewRecordEntity> last24h = listRecordsSince(taskScope, dayAgo);
        long completedLastHour = last24h.stream()
                .filter(r -> r.getFinishedAt() != null && !r.getFinishedAt().isBefore(hourAgo))
                .count();
        long completedLast24h = last24h.size();
        long failedLast24h = last24h.stream().filter(r -> "FAILED".equalsIgnoreCase(r.getStatus())).count();
        double failureRate = completedLast24h <= 0 ? 0.0 : roundOne((failedLast24h * 100.0) / completedLast24h);
        double avgLatency = last24h.stream()
                .map(AiReviewRecordEntity::getTotalLatencyMs)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);
        long totalTokens = last24h.stream()
                .map(AiReviewRecordEntity::getTotalTokens)
                .filter(Objects::nonNull)
                .mapToLong(Integer::longValue)
                .sum();
        BigDecimal estimatedCostLast24Hours = sumEstimatedCost(last24h);
        long attention = last24h.stream()
                .filter(r -> "FAILED".equalsIgnoreCase(r.getStatus())
                        || (r.getAttemptCount() != null && r.getAttemptCount() > 2)
                        || "LEGACY_BACKFILLED".equalsIgnoreCase(r.getTraceabilityStatus()))
                .count();
        return new AiReviewObservabilitySummary(
                countAsyncTasks(taskScope, AsyncTaskStatus.PENDING),
                countAsyncTasks(taskScope, AsyncTaskStatus.RUNNING),
                completedLastHour,
                completedLast24h,
                failedLast24h,
                failureRate,
                roundOne(avgLatency),
                totalTokens,
                estimatedCostLast24Hours,
                attention,
                now);
    }

    private BigDecimal sumEstimatedCost(List<AiReviewRecordEntity> records) {
        Map<String, LlmModelEntity> cache = new HashMap<>();
        BigDecimal total = null;
        for (AiReviewRecordEntity record : records) {
            BigDecimal cost = llmModelCostResolver.estimateCost(
                    cache,
                    record.getPlatformKey(),
                    record.getModelId(),
                    record.getPromptTokens(),
                    record.getCompletionTokens());
            if (cost == null) {
                continue;
            }
            total = total == null ? cost : total.add(cost);
        }
        return total;
    }

    private long countAsyncTasks(List<Long> taskScope, String... statuses) {
        if (taskScope != null && !taskScope.isEmpty()) {
            List<Long> submissionIds = submissionMapper.selectList(new LambdaQueryWrapper<SubmissionEntity>()
                            .eq(SubmissionEntity::getDeletedFlag, 0)
                            .in(SubmissionEntity::getTaskId, taskScope))
                    .stream()
                    .map(SubmissionEntity::getId)
                    .toList();
            if (submissionIds.isEmpty()) {
                return 0;
            }
            LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                    .eq(AsyncTaskEntity::getTaskType, "AI_REVIEW")
                    .eq(AsyncTaskEntity::getBizType, "SUBMISSION")
                    .in(AsyncTaskEntity::getBizId, submissionIds)
                    .in(AsyncTaskEntity::getStatus, List.of(statuses));
            return asyncTaskMapper.selectCount(wrapper);
        }
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                .eq(AsyncTaskEntity::getTaskType, "AI_REVIEW")
                .in(AsyncTaskEntity::getStatus, List.of(statuses));
        return asyncTaskMapper.selectCount(wrapper);
    }

    private List<AiReviewRecordEntity> listRecordsSince(List<Long> taskScope, Instant from) {
        LambdaQueryWrapper<AiReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewRecordEntity::getDeletedFlag, 0)
                .ge(AiReviewRecordEntity::getStartedAt, from)
                .orderByDesc(AiReviewRecordEntity::getStartedAt);
        if (taskScope != null && !taskScope.isEmpty()) {
            wrapper.in(AiReviewRecordEntity::getTaskId, taskScope);
        }
        return aiReviewRecordMapper.selectList(wrapper);
    }

    private List<AiReviewThroughputPoint> buildThroughputTrend(List<AiReviewRecordEntity> records, int trendHours) {
        Map<String, List<AiReviewRecordEntity>> buckets = new LinkedHashMap<>();
        ZoneId zone = ZoneId.systemDefault();
        LocalDateTime end = LocalDateTime.now(zone).withMinute(0).withSecond(0).withNano(0);
        for (int i = trendHours - 1; i >= 0; i--) {
            buckets.put(end.minusHours(i).format(BUCKET_FORMAT), new ArrayList<>());
        }
        for (AiReviewRecordEntity record : records) {
            if (record.getStartedAt() == null) {
                continue;
            }
            String key = LocalDateTime.ofInstant(record.getStartedAt(), zone)
                    .withMinute(0)
                    .withSecond(0)
                    .withNano(0)
                    .format(BUCKET_FORMAT);
            buckets.computeIfAbsent(key, ignored -> new ArrayList<>()).add(record);
        }
        return buckets.entrySet().stream()
                .map(entry -> {
                    List<AiReviewRecordEntity> bucketRecords = entry.getValue();
                    long failed = bucketRecords.stream()
                            .filter(r -> "FAILED".equalsIgnoreCase(r.getStatus()))
                            .count();
                    double avgLatency = bucketRecords.stream()
                            .map(AiReviewRecordEntity::getTotalLatencyMs)
                            .filter(Objects::nonNull)
                            .mapToInt(Integer::intValue)
                            .average()
                            .orElse(0.0);
                    return new AiReviewThroughputPoint(
                            entry.getKey(),
                            bucketRecords.size(),
                            failed,
                            roundOne(avgLatency));
                })
                .toList();
    }

    private List<AiReviewModelBucket> buildModelDistribution(List<AiReviewRecordEntity> records) {
        Map<String, List<AiReviewRecordEntity>> grouped = records.stream()
                .collect(Collectors.groupingBy(r -> r.getPlatformKey() + "::" + r.getModelId()));
        return grouped.entrySet().stream()
                .map(entry -> {
                    String[] parts = entry.getKey().split("::", 2);
                    List<AiReviewRecordEntity> bucket = entry.getValue();
                    long failed = bucket.stream().filter(r -> "FAILED".equalsIgnoreCase(r.getStatus())).count();
                    double avgLatency = bucket.stream()
                            .map(AiReviewRecordEntity::getTotalLatencyMs)
                            .filter(Objects::nonNull)
                            .mapToInt(Integer::intValue)
                            .average()
                            .orElse(0.0);
                    return new AiReviewModelBucket(
                            parts[0],
                            parts.length > 1 ? parts[1] : "",
                            bucket.size(),
                            failed,
                            roundOne(avgLatency));
                })
                .sorted(Comparator.comparingLong(AiReviewModelBucket::count).reversed())
                .limit(TOP_K)
                .toList();
    }

    private List<AiReviewTopKItem> topSlow(List<AiReviewRecordEntity> records, boolean includeSensitive) {
        Map<Long, TaskEntity> tasks = loadTasks(records);
        Map<String, LlmModelEntity> costCache = new HashMap<>();
        return records.stream()
                .filter(r -> r.getTotalLatencyMs() != null)
                .sorted(Comparator.comparing(AiReviewRecordEntity::getTotalLatencyMs).reversed())
                .limit(TOP_K)
                .map(r -> toTopK(r, tasks.get(r.getTaskId()), costCache, includeSensitive))
                .toList();
    }

    private List<AiReviewTopKItem> topFailed(List<AiReviewRecordEntity> records, boolean includeSensitive) {
        Map<Long, TaskEntity> tasks = loadTasks(records);
        Map<String, LlmModelEntity> costCache = new HashMap<>();
        return records.stream()
                .filter(r -> "FAILED".equalsIgnoreCase(r.getStatus()))
                .sorted(Comparator.comparing(AiReviewRecordEntity::getFinishedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(TOP_K)
                .map(r -> toTopK(r, tasks.get(r.getTaskId()), costCache, includeSensitive))
                .toList();
    }

    private List<AiReviewTopKItem> topRetry(List<AiReviewRecordEntity> records, boolean includeSensitive) {
        Map<Long, TaskEntity> tasks = loadTasks(records);
        Map<String, LlmModelEntity> costCache = new HashMap<>();
        return records.stream()
                .filter(r -> r.getAttemptCount() != null && r.getAttemptCount() > 1)
                .sorted(Comparator.comparing(AiReviewRecordEntity::getAttemptCount).reversed())
                .limit(TOP_K)
                .map(r -> toTopK(r, tasks.get(r.getTaskId()), costCache, includeSensitive))
                .toList();
    }

    private AiReviewTopKItem toTopK(
            AiReviewRecordEntity record,
            TaskEntity task,
            Map<String, LlmModelEntity> costCache,
            boolean includeSensitive) {
        return new AiReviewTopKItem(
                record.getId(),
                record.getSubmissionId(),
                record.getTaskId(),
                task == null ? null : task.getTitle(),
                task == null ? null : task.getTaskCode(),
                includeSensitive ? record.getModelId() : null,
                record.getStatus(),
                record.getVerdict(),
                record.getAttemptCount(),
                record.getTotalLatencyMs(),
                includeSensitive ? record.getTotalTokens() : null,
                includeSensitive ? record.getPromptTokens() : null,
                includeSensitive ? record.getCompletionTokens() : null,
                includeSensitive
                        ? llmModelCostResolver.estimateCost(
                                costCache,
                                record.getPlatformKey(),
                                record.getModelId(),
                                record.getPromptTokens(),
                                record.getCompletionTokens())
                        : null,
                record.getTraceabilityStatus(),
                record.getStartedAt(),
                record.getFinishedAt(),
                record.getFailureReason());
    }

    private Map<Long, TaskEntity> loadTasks(List<AiReviewRecordEntity> records) {
        Set<Long> taskIds = records.stream().map(AiReviewRecordEntity::getTaskId).collect(Collectors.toSet());
        if (taskIds.isEmpty()) {
            return Map.of();
        }
        return taskMapper.selectBatchIds(taskIds).stream()
                .collect(Collectors.toMap(TaskEntity::getId, t -> t, (a, b) -> a, HashMap::new));
    }

    private AiReviewObservabilityRecordPage pageRecords(
            List<Long> taskScope,
            int page,
            int size,
            Long taskId,
            String status,
            String modelId,
            String verdict,
            boolean includeSensitive) {
        LambdaQueryWrapper<AiReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewRecordEntity::getDeletedFlag, 0);
        if (taskScope != null && !taskScope.isEmpty()) {
            wrapper.in(AiReviewRecordEntity::getTaskId, taskScope);
        }
        if (taskId != null) {
            wrapper.eq(AiReviewRecordEntity::getTaskId, taskId);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(AiReviewRecordEntity::getStatus, status.trim());
        }
        if (includeSensitive && StringUtils.hasText(modelId)) {
            wrapper.eq(AiReviewRecordEntity::getModelId, modelId.trim());
        }
        if (StringUtils.hasText(verdict)) {
            wrapper.eq(AiReviewRecordEntity::getVerdict, verdict.trim());
        }
        wrapper.orderByDesc(AiReviewRecordEntity::getStartedAt);
        Page<AiReviewRecordEntity> result = aiReviewRecordMapper.selectPage(new Page<>(page, size), wrapper);
        Map<Long, TaskEntity> tasks = loadTasks(result.getRecords());
        Map<String, LlmModelEntity> costCache = new HashMap<>();
        List<AiReviewObservabilityRecordSummary> rows = result.getRecords().stream()
                .map(record -> toSummary(record, tasks.get(record.getTaskId()), costCache, includeSensitive))
                .toList();
        return new AiReviewObservabilityRecordPage(
                PageResponse.of(result.getTotal(), page, size, rows));
    }

    private AiReviewObservabilityRecordDetail recordDetail(
            Long aiReviewId, List<Long> taskScope, boolean includeSensitive) {
        AiReviewRecordEntity record = requireRecord(aiReviewId, taskScope);
        TaskEntity task = taskMapper.selectById(record.getTaskId());
        List<AiReviewLlmAttemptEntity> attemptEntities = aiReviewLlmAttemptMapper.selectList(
                new LambdaQueryWrapper<AiReviewLlmAttemptEntity>()
                        .eq(AiReviewLlmAttemptEntity::getDeletedFlag, 0)
                        .eq(AiReviewLlmAttemptEntity::getAiReviewId, aiReviewId)
                        .orderByAsc(AiReviewLlmAttemptEntity::getAttemptNo));
        Map<String, LlmModelEntity> costCache = new HashMap<>();
        List<AiReviewLlmAttempt> attempts = attemptEntities.stream()
                .map(entity -> toAttemptDto(entity, includeSensitive, costCache))
                .toList();
        List<AiReviewTimelineEntry> timeline = buildTimeline(record);
        return new AiReviewObservabilityRecordDetail(
                toSummary(record, task, costCache, includeSensitive),
                attempts,
                timeline,
                includeSensitive ? record.getPromptSnapshot() : null,
                includeSensitive ? record.getRawResponseText() : null);
    }

    private List<AiReviewTimelineEntry> buildTimeline(AiReviewRecordEntity record) {
        List<AiReviewTimelineEntry> timeline = new ArrayList<>();
        timeline.add(new AiReviewTimelineEntry(
                "AI_REVIEW",
                record.getStatus(),
                "AI 预审记录 " + record.getId(),
                record.getStartedAt(),
                record.getTraceabilityStatus()));
        if (record.getAsyncTaskId() != null) {
            AsyncTaskEntity asyncTask = asyncTaskMapper.selectById(record.getAsyncTaskId());
            if (asyncTask != null) {
                timeline.add(new AiReviewTimelineEntry(
                        "ASYNC_TASK",
                        asyncTask.getStatus(),
                        "异步任务 " + asyncTask.getId(),
                        asyncTask.getStartedAt(),
                        "FULL"));
                if (asyncTask.getFinishedAt() != null) {
                    timeline.add(new AiReviewTimelineEntry(
                            "ASYNC_TASK_FINISHED",
                            asyncTask.getStatus(),
                            asyncTask.getLastErrorMessage(),
                            asyncTask.getFinishedAt(),
                            "FULL"));
                }
            }
        }
        List<SubmissionStatusHistoryEntity> histories = submissionStatusHistoryMapper.selectList(
                new LambdaQueryWrapper<SubmissionStatusHistoryEntity>()
                        .eq(SubmissionStatusHistoryEntity::getDeletedFlag, 0)
                        .eq(SubmissionStatusHistoryEntity::getSubmissionId, record.getSubmissionId())
                        .orderByAsc(SubmissionStatusHistoryEntity::getOccurredAt));
        for (SubmissionStatusHistoryEntity history : histories) {
            timeline.add(new AiReviewTimelineEntry(
                    "SUBMISSION",
                    history.getToStatus(),
                    history.getActionCode(),
                    history.getOccurredAt(),
                    "FULL"));
        }
        timeline.sort(Comparator.comparing(AiReviewTimelineEntry::occurredAt, Comparator.nullsLast(Comparator.naturalOrder())));
        return timeline;
    }

    private AiReviewLlmAttempt toAttemptDto(
            AiReviewLlmAttemptEntity entity,
            boolean includeSensitive,
            Map<String, LlmModelEntity> costCache) {
        return new AiReviewLlmAttempt(
                entity.getAttemptNo() == null ? 0 : entity.getAttemptNo(),
                includeSensitive ? entity.getPlatformKey() : null,
                includeSensitive ? entity.getModelId() : null,
                includeSensitive ? entity.getProviderRequestId() : null,
                includeSensitive ? entity.getPromptSnapshot() : null,
                includeSensitive ? entity.getResponseSnapshot() : summarizeResponse(entity.getResponseSnapshot()),
                entity.getErrorMessage(),
                entity.getSuccessFlag() != null && entity.getSuccessFlag() == 1,
                entity.getLatencyMs(),
                includeSensitive ? entity.getPromptTokens() : null,
                includeSensitive ? entity.getCompletionTokens() : null,
                includeSensitive ? entity.getTotalTokens() : null,
                includeSensitive
                        ? llmModelCostResolver.estimateCost(
                                costCache,
                                entity.getPlatformKey(),
                                entity.getModelId(),
                                entity.getPromptTokens(),
                                entity.getCompletionTokens())
                        : null,
                entity.getTraceabilityStatus(),
                entity.getHistoryGapReason());
    }

    private String summarizeResponse(String response) {
        if (!StringUtils.hasText(response)) {
            return null;
        }
        return response.length() <= 160 ? response : response.substring(0, 160) + "...";
    }

    private AiReviewObservabilityRecordSummary toSummary(
            AiReviewRecordEntity record,
            TaskEntity task,
            Map<String, LlmModelEntity> costCache,
            boolean includeSensitive) {
        return new AiReviewObservabilityRecordSummary(
                record.getId(),
                record.getSubmissionId(),
                record.getSubmissionVersionId(),
                record.getTaskId(),
                task == null ? null : task.getTitle(),
                task == null ? null : task.getTaskCode(),
                includeSensitive ? record.getPlatformKey() : null,
                includeSensitive ? record.getModelId() : null,
                record.getStatus(),
                record.getVerdict(),
                record.getAttemptCount(),
                record.getTotalLatencyMs(),
                includeSensitive ? record.getTotalTokens() : null,
                includeSensitive ? record.getPromptTokens() : null,
                includeSensitive ? record.getCompletionTokens() : null,
                includeSensitive
                        ? llmModelCostResolver.estimateCost(
                                costCache,
                                record.getPlatformKey(),
                                record.getModelId(),
                                record.getPromptTokens(),
                                record.getCompletionTokens())
                        : null,
                record.getTraceabilityStatus(),
                record.getHistoryGapReason(),
                record.getStartedAt(),
                record.getFinishedAt(),
                record.getFailureReason());
    }

    private AiReviewObservabilitySummary redactOperationalSummary(AiReviewObservabilitySummary summary) {
        return new AiReviewObservabilitySummary(
                summary.queuePending(),
                summary.queueRunning(),
                summary.reviewsLastHour(),
                summary.reviewsLast24Hours(),
                summary.failedLast24Hours(),
                summary.failureRateLast24Hours(),
                summary.avgLatencyMsLast24Hours(),
                0,
                null,
                summary.attentionCount(),
                summary.refreshedAt());
    }

    private AiReviewRecordEntity requireRecord(Long aiReviewId, List<Long> taskScope) {
        AiReviewRecordEntity record = aiReviewRecordMapper.selectById(aiReviewId);
        if (record == null || record.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "AI review record not found");
        }
        if (taskScope != null && !taskScope.isEmpty() && !taskScope.contains(record.getTaskId())) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN, "AI review record not accessible");
        }
        return record;
    }

    private List<Long> ownedTaskIds() {
        Long userId = currentUserContext.requireUserId();
        if (userId == null) {
            return List.of();
        }
        return taskMapper.selectList(new LambdaQueryWrapper<TaskEntity>()
                        .eq(TaskEntity::getDeletedFlag, 0)
                        .eq(TaskEntity::getOwnerId, userId))
                .stream()
                .map(TaskEntity::getId)
                .toList();
    }

    private AiReviewObservabilityOverview emptyOverview(boolean includeSensitive) {
        return new AiReviewObservabilityOverview(
                includeSensitive ? emptySummary() : redactOperationalSummary(emptySummary()),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of());
    }

    private AiReviewObservabilitySummary emptySummary() {
        return new AiReviewObservabilitySummary(0, 0, 0, 0, 0, 0.0, 0.0, 0, null, 0, Instant.now());
    }

    private int normalizeTrendHours(int trendHours) {
        if (trendHours <= 0) {
            return DEFAULT_TREND_HOURS;
        }
        return Math.min(trendHours, 168);
    }

    private static double roundOne(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

}
