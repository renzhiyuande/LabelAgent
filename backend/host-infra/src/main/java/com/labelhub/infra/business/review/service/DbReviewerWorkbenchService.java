package com.labelhub.infra.business.review.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.labelhub.infra.business.AbstractDbService;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.infra.system.UserDisplayNameResolver;
import com.labelhub.core.business.BusinessDtos.AiQueueStatsSummary;
import com.labelhub.core.business.BusinessDtos.AiQueueStatusCounts;
import com.labelhub.core.business.BusinessDtos.ReviewBatchOperationRow;
import com.labelhub.core.business.BusinessDtos.ReviewerAiQueueAdvanceCommand;
import com.labelhub.core.business.BusinessDtos.ReviewerAiReviewSnapshot;
import com.labelhub.core.business.BusinessDtos.ReviewerBatchDecisionCommand;
import com.labelhub.core.business.BusinessDtos.ReviewerBatchSubmitResult;
import com.labelhub.core.business.BusinessDtos.ReviewerDecisionCommand;
import com.labelhub.core.business.BusinessDtos.AuditPoolGroupRow;
import com.labelhub.core.business.BusinessDtos.AuditPoolLevelCount;
import com.labelhub.core.business.BusinessDtos.AuditPoolMetaSummary;
import com.labelhub.core.business.BusinessDtos.ReviewWorkflowLevelDto;
import com.labelhub.core.business.BusinessDtos.ReviewerQueueRow;
import com.labelhub.core.business.BusinessDtos.ReviewerReviewRecordDetail;
import com.labelhub.core.business.BusinessDtos.ReviewerReviewRecordListRow;
import com.labelhub.core.business.BusinessDtos.ReviewerReviewRecordRow;
import com.labelhub.infra.datapermission.DataPermissionRule;
import com.labelhub.infra.datapermission.DataScopeAspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.labelhub.core.business.BusinessDtos.ReviewerSubmissionDetail;
import com.labelhub.core.business.BusinessDtos.ReviewerTimelineEntry;
import com.labelhub.core.business.BusinessDtos.SubmissionFieldDiff;
import com.labelhub.core.business.BusinessDtos.SubmissionTimelineEntry;
import com.labelhub.core.business.BusinessDtos.TaskOptionRow;
import com.labelhub.core.business.ReviewerWorkbenchService;
import com.labelhub.core.business.RewardSettlementService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.async.AsyncTaskStatus;
import com.labelhub.infra.business.display.FormSchemaDraftPreviewSupport;
import com.labelhub.infra.business.display.assembler.SubmissionTimelineAssembler;
import com.labelhub.infra.business.display.support.FormSchemaRuntimeSanitizer;
import com.labelhub.infra.business.display.TaskPayloadPreviewSupport;
import com.labelhub.infra.business.review.support.AiReviewRecordReader;
import com.labelhub.infra.business.assignment.workflow.AssignmentStateMachineService;
import com.labelhub.infra.business.review.support.ReviewWorkflowLevel;
import com.labelhub.infra.business.review.support.ReviewWorkflowResolver;
import com.labelhub.infra.business.review.support.ReviewerReviewLevelAccess;
import com.labelhub.infra.business.review.support.ReviewerTaskMemberAccess;
import com.labelhub.infra.notification.service.DbNotificationService;
import com.labelhub.infra.business.submission.support.SubmissionVersionReader;
import com.labelhub.infra.business.submission.workflow.SubmissionStateMachineService;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.ReviewBatchOperationEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.ReviewBatchOperationMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.statemachine.AssignmentStatus;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import com.labelhub.infra.util.SubmissionDiffUtil;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbReviewerWorkbenchService extends AbstractDbService<SubmissionEntity> implements ReviewerWorkbenchService {
    private static final Logger log = LoggerFactory.getLogger(DbReviewerWorkbenchService.class);
    private static final Set<String> AI_QUEUE_STATUSES = Set.of(
            SubmissionStatus.SUBMITTED.name(),
            SubmissionStatus.AI_REVIEWING.name(),
            SubmissionStatus.AI_PASSED.name(),
            SubmissionStatus.AI_REJECTED.name(),
            SubmissionStatus.HUMAN_REVIEWING.name());

    private final SubmissionMapper submissionMapper;
    private final AssignmentMapper assignmentMapper;
    private final ReviewRecordMapper reviewRecordMapper;
    private final ReviewBatchOperationMapper reviewBatchOperationMapper;
    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final UserMapper userMapper;
    private final UserDisplayNameResolver userDisplayNameResolver;
    private final SubmissionStateMachineService submissionStateMachineService;
    private final AssignmentStateMachineService assignmentStateMachineService;
    private final SubmissionVersionReader submissionVersionReader;
    private final ReviewWorkflowResolver reviewWorkflowResolver;
    private final ReviewerReviewLevelAccess reviewerReviewLevelAccess;
    private final ReviewerTaskMemberAccess reviewerTaskMemberAccess;
    private final CurrentUserProvider currentUserProvider;
    private final CurrentUserContext currentUserContext;
    private final AsyncTaskService asyncTaskService;
    private final AsyncTaskMapper asyncTaskMapper;
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final AiReviewRecordReader aiReviewRecordReader;
    private final SubmissionTimelineAssembler submissionTimelineAssembler;
    private final RewardSettlementService rewardSettlementService;
    private final ObjectMapper objectMapper;
    private final DbNotificationService notificationService;

    public DbReviewerWorkbenchService(
            SubmissionMapper submissionMapper,
            AssignmentMapper assignmentMapper,
            ReviewRecordMapper reviewRecordMapper,
            ReviewBatchOperationMapper reviewBatchOperationMapper,
            TaskMapper taskMapper,
            TaskItemMapper taskItemMapper,
            TemplateVersionMapper templateVersionMapper,
            UserMapper userMapper,
            UserDisplayNameResolver userDisplayNameResolver,
            SubmissionStateMachineService submissionStateMachineService,
            AssignmentStateMachineService assignmentStateMachineService,
            SubmissionVersionReader submissionVersionReader,
            ReviewWorkflowResolver reviewWorkflowResolver,
            ReviewerReviewLevelAccess reviewerReviewLevelAccess,
            ReviewerTaskMemberAccess reviewerTaskMemberAccess,
            CurrentUserProvider currentUserProvider,
            CurrentUserContext currentUserContext,
            AsyncTaskService asyncTaskService,
            AsyncTaskMapper asyncTaskMapper,
            AiReviewRecordMapper aiReviewRecordMapper,
            AiReviewRecordReader aiReviewRecordReader,
            SubmissionTimelineAssembler submissionTimelineAssembler,
            RewardSettlementService rewardSettlementService,
            ObjectMapper objectMapper,
            DbNotificationService notificationService) {
        this.submissionMapper = submissionMapper;
        this.assignmentMapper = assignmentMapper;
        this.reviewRecordMapper = reviewRecordMapper;
        this.reviewBatchOperationMapper = reviewBatchOperationMapper;
        this.taskMapper = taskMapper;
        this.taskItemMapper = taskItemMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.userMapper = userMapper;
        this.userDisplayNameResolver = userDisplayNameResolver;
        this.submissionStateMachineService = submissionStateMachineService;
        this.assignmentStateMachineService = assignmentStateMachineService;
        this.submissionVersionReader = submissionVersionReader;
        this.reviewWorkflowResolver = reviewWorkflowResolver;
        this.reviewerReviewLevelAccess = reviewerReviewLevelAccess;
        this.reviewerTaskMemberAccess = reviewerTaskMemberAccess;
        this.currentUserProvider = currentUserProvider;
        this.currentUserContext = currentUserContext;
        this.asyncTaskService = asyncTaskService;
        this.asyncTaskMapper = asyncTaskMapper;
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.aiReviewRecordReader = aiReviewRecordReader;
        this.submissionTimelineAssembler = submissionTimelineAssembler;
        this.rewardSettlementService = rewardSettlementService;
        this.objectMapper = objectMapper;
        this.notificationService = notificationService;
    }

    // ── AI Queue ──

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public PageResponse<ReviewerQueueRow> listAiQueue(ParsedListQuery query, String queueStatus) {
        LambdaQueryWrapper<SubmissionEntity> wrapper = baseQueueWrapper(AI_QUEUE_STATUSES);
        com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
        if (applyQueueStatusFilter(wrapper, queueStatus, true)) {
            return PageResponse.of(0L, query.page(), query.pageSize(), List.of());
        }
        applyKeyword(wrapper, query);
        wrapper.orderByDesc(SubmissionEntity::getLastSubmittedAt).orderByDesc(SubmissionEntity::getUpdatedAt);
        return pageRows(wrapper, query, true);
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public ReviewerSubmissionDetail getAiQueueDetail(Long submissionId) {
        SubmissionEntity entity = requireSubmissionInStatuses(submissionId, AI_QUEUE_STATUSES);
        return toDetail(entity, true);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public ReviewerSubmissionDetail advanceAiQueue(Long submissionId, ReviewerAiQueueAdvanceCommand command) {
        SubmissionEntity entity = requireSubmissionInStatuses(submissionId, AI_QUEUE_STATUSES);
        SubmissionEvent event = switch (command.action()) {
            case "pass" -> SubmissionEvent.AI_PASS;
            case "reject" -> SubmissionEvent.AI_REJECT;
            case "manual" -> SubmissionEvent.AI_REQUIRE_HUMAN;
            default -> throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Unsupported AI queue action");
        };
        transitionSubmission(entity.getId(), event, command.commentText(), currentUserContext.requireUserId(), null);
        return toDetail(requireSubmission(submissionId), true);
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public AiQueueStatusCounts listAiQueueStatusCounts() {
        LambdaQueryWrapper<SubmissionEntity> wrapper = baseQueueWrapper(AI_QUEUE_STATUSES);
        com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
        wrapper.select(SubmissionEntity::getId, SubmissionEntity::getCurrentStatus);
        List<SubmissionEntity> entities = submissionMapper.selectList(wrapper);
        Set<Long> failedSubmissionIds = loadFailedAiReviewSubmissionIds();
        long pending = 0;
        long passed = 0;
        long returned = 0;
        long manual = 0;
        long failed = 0;
        for (SubmissionEntity entity : entities) {
            switch (mapAiQueueStatus(entity.getCurrentStatus(), failedSubmissionIds.contains(entity.getId()))) {
                case "pending" -> pending++;
                case "passed" -> passed++;
                case "returned" -> returned++;
                case "manual" -> manual++;
                case "failed" -> failed++;
                default -> {
                }
            }
        }
        return new AiQueueStatusCounts(entities.size(), pending, passed, returned, manual, failed);
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public AiQueueStatsSummary listAiQueueStats(Long taskId) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        Set<String> roles = user.roles() != null ? user.roles() : Set.of();
        Set<String> permissions = user.permissions() != null ? user.permissions() : Set.of();
        if (taskId != null && taskId > 0) {
            reviewerTaskMemberAccess.requireTaskAccess(taskId, user.userId(), roles, permissions);
        }
        Instant since = Instant.now().minusSeconds(3600);
        LambdaQueryWrapper<AiReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewRecordEntity::getDeletedFlag, 0)
                .eq(AiReviewRecordEntity::getStatus, "SUCCESS")
                .ge(AiReviewRecordEntity::getFinishedAt, since);
        if (taskId != null && taskId > 0) {
            wrapper.eq(AiReviewRecordEntity::getTaskId, taskId);
        } else if (!reviewerTaskMemberAccess.hasUnrestrictedReviewScope(roles, permissions)) {
            List<Long> accessibleTaskIds =
                    reviewerTaskMemberAccess.listAccessibleTaskIds(user.userId(), roles, permissions);
            if (accessibleTaskIds.isEmpty()) {
                return new AiQueueStatsSummary(0D, 0D, 0D, null);
            }
            wrapper.in(AiReviewRecordEntity::getTaskId, accessibleTaskIds);
        }
        List<AiReviewRecordEntity> records = aiReviewRecordMapper.selectList(wrapper);
        double throughput = records.isEmpty() ? 0D : records.size() / 3600D;
        double averageLatency = records.stream()
                .filter(record -> record.getStartedAt() != null && record.getFinishedAt() != null)
                .mapToDouble(record -> Duration.between(record.getStartedAt(), record.getFinishedAt()).toMillis() / 1000D)
                .average()
                .orElse(0D);
        long duplicateCount = records.stream().filter(record -> record.getRetryNo() != null && record.getRetryNo() > 0).count();
        double duplicateRate = records.isEmpty() ? 0D : duplicateCount * 100D / records.size();
        String taskName = null;
        if (taskId != null) {
            TaskEntity task = taskMapper.selectById(taskId);
            taskName = task == null ? null : task.getTitle();
        }
        return new AiQueueStatsSummary(throughput, averageLatency, duplicateRate, taskName);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public ReviewerSubmissionDetail retryAiQueueReview(Long submissionId) {
        SubmissionEntity entity = requireSubmission(submissionId);
        if (!SubmissionStatus.AI_REVIEWING.name().equals(entity.getCurrentStatus())) {
            throw new BusinessException(ErrorCode.SUBMISSION_STATUS_INVALID,
                    "Only submissions in AI_REVIEWING can retry AI review");
        }
        AsyncTaskEntity failedTask = findLatestFailedAiReviewTask(submissionId);
        if (failedTask != null) {
            resetAsyncTaskToPending(failedTask);
        } else {
            int submitCount = entity.getSubmitCount() == null ? 1 : entity.getSubmitCount();
            asyncTaskService.enqueue("AI_REVIEW", "SUBMISSION", submissionId,
                    "ai-review:" + submissionId + ":manual:" + submitCount + ":" + UUID.randomUUID(), 5, Map.of(
                            "submissionId", submissionId,
                            "manualRetry", true));
        }
        return toDetail(requireSubmission(submissionId), true);
    }

    // ── Audit Pool ──

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public PageResponse<ReviewerQueueRow> listAuditPool(
            ParsedListQuery query, String scopeType, List<Long> scopeIds, String reviewLevel) {
        String normalizedScope = normalizeAuditPoolScopeType(scopeType);
        if (scopeIds == null || scopeIds.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "scopeIds is required for audit pool queue");
        }
        if (scopeIds.size() > 100) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "scopeIds exceeds limit of 100");
        }
        List<Long> validScopeIds = scopeIds.stream().filter(id -> id != null && id > 0).distinct().toList();
        if (validScopeIds.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "scopeIds is required for audit pool queue");
        }
        LambdaQueryWrapper<SubmissionEntity> wrapper = baseQueueWrapper(Set.of(SubmissionStatus.HUMAN_REVIEWING.name()));
        com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
        applyAuditPoolScopes(wrapper, normalizedScope, validScopeIds);
        applyAuditPoolLevelFilter(wrapper, reviewLevel, normalizedScope, validScopeIds);
        applyKeyword(wrapper, query);
        wrapper.orderByDesc(SubmissionEntity::getUpdatedAt);
        return pageRows(wrapper, query, false);
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public PageResponse<AuditPoolGroupRow> listAuditPoolGroups(ParsedListQuery query, String groupBy, String reviewLevel) {
        String normalizedGroupBy = normalizeAuditPoolScopeType(groupBy);
        QueryWrapper<SubmissionEntity> wrapper = auditPoolBaseQueryWrapper();
        applyAuditPoolLevelFilterOnQueryWrapper(wrapper, reviewLevel, normalizedGroupBy, List.of());
        applyKeywordOnQueryWrapper(wrapper, query);
        String groupColumn = auditPoolGroupColumn(normalizedGroupBy);
        wrapper.select(
                groupColumn + " AS scope_id",
                "COUNT(1) AS submission_count",
                "MAX(updated_at) AS last_activity_at");
        wrapper.groupBy(groupColumn);
        List<Map<String, Object>> groupedRows = submissionMapper.selectMaps(wrapper);
        List<AuditPoolGroupRow> allGroups = groupedRows.stream()
                .map(row -> toAuditPoolGroupRow(normalizedGroupBy, row))
                .sorted((left, right) -> right.lastActivityAt().compareTo(left.lastActivityAt()))
                .toList();
        int page = Math.max(query.page(), 1);
        int pageSize = Math.max(query.pageSize(), 1);
        int from = (page - 1) * pageSize;
        if (from >= allGroups.size()) {
            return PageResponse.of(allGroups.size(), page, pageSize, List.of());
        }
        int to = Math.min(from + pageSize, allGroups.size());
        return PageResponse.of(allGroups.size(), page, pageSize, allGroups.subList(from, to));
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public AuditPoolMetaSummary getAuditPoolMeta(Long taskId) {
        String workflowJson = null;
        if (taskId != null && taskId > 0) {
            AuthenticatedUser user = currentUserProvider.currentUser();
            reviewerTaskMemberAccess.requireTaskAccess(
                    taskId,
                    user.userId(),
                    user.roles() != null ? user.roles() : Set.of(),
                    user.permissions());
            workflowJson = resolveTaskWorkflowJson(requireTask(taskId));
        }
        List<ReviewWorkflowLevel> definition = reviewWorkflowResolver.parseDefinition(workflowJson);
        Set<String> permissions = reviewerPermissions();
        List<ReviewWorkflowLevel> accessible =
                reviewerReviewLevelAccess.filterAccessibleLevels(definition, permissions);
        String firstLevelKey = definition.getFirst().key();
        List<AuditPoolLevelCount> levels = new ArrayList<>();
        for (ReviewWorkflowLevel level : accessible) {
            long pendingCount = countAuditPoolPending(taskId, level.key(), firstLevelKey);
            levels.add(new AuditPoolLevelCount(
                    level.key(),
                    level.label(),
                    reviewWorkflowResolver.stageNo(workflowJson, level.key()),
                    reviewWorkflowResolver.isFinalLevel(workflowJson, level.key()),
                    pendingCount));
        }
        return new AuditPoolMetaSummary(levels);
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public List<AuditPoolLevelCount> listReviewLevelOptions(Long taskId) {
        Set<String> permissions = reviewerPermissions();
        if (taskId != null && taskId > 0) {
            AuthenticatedUser user = currentUserProvider.currentUser();
            reviewerTaskMemberAccess.requireTaskAccess(
                    taskId,
                    user.userId(),
                    user.roles() != null ? user.roles() : Set.of(),
                    permissions);
            String workflowJson = resolveTaskWorkflowJson(requireTask(taskId));
            return toReviewLevelOptions(workflowJson, permissions);
        }
        return aggregateReviewLevelOptions(permissions);
    }

    private static final int MAX_TASK_OPTIONS = 100;

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public List<TaskOptionRow> listAccessibleTaskOptions(String keyword) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        Set<String> roles = user.roles() != null ? user.roles() : Set.of();
        Set<String> permissions = reviewerPermissions();
        if (keyword != null && keyword.matches("\\d{8,}")) {
            try {
                long taskId = Long.parseLong(keyword);
                reviewerTaskMemberAccess.requireTaskAccess(taskId, user.userId(), roles, permissions);
                TaskEntity task = taskMapper.selectById(taskId);
                if (task != null && task.getDeletedFlag() != null && task.getDeletedFlag() == 0) {
                    return List.of(toTaskOptionRow(task));
                }
            } catch (BusinessException ignored) {
                // fall through to title search
            }
        }
        List<Long> taskIds = queryDistinctTaskIdsFromScopedReviewRecords();
        if (taskIds.isEmpty()) {
            return List.of();
        }
        LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskEntity::getDeletedFlag, 0).in(TaskEntity::getId, taskIds);
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(TaskEntity::getTitle, keyword).or().like(TaskEntity::getTaskCode, keyword));
        }
        wrapper.orderByDesc(TaskEntity::getCreatedAt).last("LIMIT " + MAX_TASK_OPTIONS);
        return taskMapper.selectList(wrapper).stream().map(this::toTaskOptionRow).toList();
    }

    private TaskOptionRow toTaskOptionRow(TaskEntity entity) {
        return new TaskOptionRow(entity.getId(), entity.getTitle(), entity.getTaskCode());
    }

    private List<AuditPoolLevelCount> aggregateReviewLevelOptions(Set<String> permissions) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        Set<String> roles = user.roles() != null ? user.roles() : Set.of();
        List<Long> taskIds = resolveTaskIdsForLevelAggregation(user.userId(), roles, permissions);
        java.util.LinkedHashMap<String, LevelOptionSeed> merged = new java.util.LinkedHashMap<>();
        for (Long tid : taskIds) {
            TaskEntity task = taskMapper.selectById(tid);
            if (task == null || task.getDeletedFlag() == null || task.getDeletedFlag() != 0) {
                continue;
            }
            String workflowJson = resolveTaskWorkflowJson(task);
            List<ReviewWorkflowLevel> levels = reviewWorkflowResolver.parseDefinition(workflowJson);
            for (int index = 0; index < levels.size(); index++) {
                ReviewWorkflowLevel level = levels.get(index);
                merged.putIfAbsent(
                        level.key(),
                        new LevelOptionSeed(level.key(), level.label(), index + 1, index == levels.size() - 1));
            }
        }
        if (merged.isEmpty()) {
            return fallbackReviewLevelOptions(permissions);
        }
        List<ReviewWorkflowLevel> workflowLevels = merged.values().stream()
                .map(seed -> new ReviewWorkflowLevel(seed.key(), seed.label(), List.of()))
                .toList();
        List<ReviewWorkflowLevel> accessible =
                reviewerReviewLevelAccess.filterAccessibleLevels(workflowLevels, permissions);
        List<AuditPoolLevelCount> options = new ArrayList<>();
        for (ReviewWorkflowLevel level : accessible) {
            LevelOptionSeed seed = merged.get(level.key());
            options.add(new AuditPoolLevelCount(
                    level.key(),
                    level.label(),
                    seed.stageNo(),
                    seed.isFinal(),
                    0L));
        }
        return options;
    }

    private List<Long> resolveTaskIdsForLevelAggregation(Long userId, Set<String> roles, Set<String> permissions) {
        if (reviewerTaskMemberAccess.hasUnrestrictedReviewScope(roles, permissions)) {
            return queryDistinctTaskIdsFromScopedReviewRecords();
        }
        return reviewerTaskMemberAccess.listAccessibleTaskIds(userId, roles, permissions);
    }

    /**
     * Distinct task ids from review records visible under current REVIEW {@code @DataScope}.
     * Aligns reviewer review-result task filter with {@link #listReviewRecords}.
     */
    private List<Long> queryDistinctTaskIdsFromScopedReviewRecords() {
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0)
                .in(ReviewRecordEntity::getAction, List.of("APPROVE", "REJECT", "RETURN"))
                .select(ReviewRecordEntity::getTaskId);
        com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
        return reviewRecordMapper.selectList(wrapper).stream()
                .map(ReviewRecordEntity::getTaskId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
    }

    private List<AuditPoolLevelCount> toReviewLevelOptions(String workflowJson, Set<String> permissions) {
        List<ReviewWorkflowLevel> definition = reviewWorkflowResolver.parseDefinition(workflowJson);
        List<ReviewWorkflowLevel> accessible =
                reviewerReviewLevelAccess.filterAccessibleLevels(definition, permissions);
        List<AuditPoolLevelCount> options = new ArrayList<>();
        for (ReviewWorkflowLevel level : accessible) {
            options.add(new AuditPoolLevelCount(
                    level.key(),
                    level.label(),
                    reviewWorkflowResolver.stageNo(workflowJson, level.key()),
                    reviewWorkflowResolver.isFinalLevel(workflowJson, level.key()),
                    0L));
        }
        return options;
    }

    private List<AuditPoolLevelCount> fallbackReviewLevelOptions(Set<String> permissions) {
        List<String> keys;
        if (reviewerReviewLevelAccess.hasUnrestrictedLevels(permissions)) {
            keys = List.of("L1", "L2", "L3");
        } else {
            keys = new ArrayList<>(reviewerReviewLevelAccess.grantedLevelKeys(permissions));
            if (keys.isEmpty()) {
                return List.of();
            }
        }
        List<AuditPoolLevelCount> options = new ArrayList<>();
        for (int index = 0; index < keys.size(); index++) {
            String key = keys.get(index);
            options.add(new AuditPoolLevelCount(
                    key,
                    reviewWorkflowResolver.labelFor(null, key),
                    index + 1,
                    index == keys.size() - 1,
                    0L));
        }
        return options;
    }

    private record LevelOptionSeed(String key, String label, int stageNo, boolean isFinal) {
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public ReviewerSubmissionDetail getAuditPoolDetail(Long submissionId) {
        return toDetail(requireSubmission(submissionId), false);
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public List<ReviewerReviewRecordRow> listSubmissionReviewRecords(Long submissionId) {
        SubmissionEntity entity = requireSubmission(submissionId);
        TaskEntity task = requireTask(entity.getTaskId());
        String workflowJson = resolveTaskWorkflowJson(task);
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0)
                .eq(ReviewRecordEntity::getSubmissionId, submissionId)
                .orderByAsc(ReviewRecordEntity::getDecidedAt)
                .orderByAsc(ReviewRecordEntity::getId);
        return reviewRecordMapper.selectList(wrapper).stream()
                .map(record -> toReviewRecordRow(record, workflowJson))
                .toList();
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public PageResponse<ReviewerReviewRecordListRow> listReviewRecords(
            ParsedListQuery query,
            Long taskId,
            String reviewLevel,
            String action,
            Instant decidedFrom,
            Instant decidedTo) {
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0)
                .in(ReviewRecordEntity::getAction, List.of("APPROVE", "REJECT", "RETURN"));
        com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
        if (taskId != null && taskId > 0) {
            wrapper.eq(ReviewRecordEntity::getTaskId, taskId);
        }
        if (StringUtils.hasText(reviewLevel)) {
            wrapper.eq(ReviewRecordEntity::getReviewLevel, reviewLevel.trim());
        }
        if (StringUtils.hasText(action)) {
            wrapper.eq(ReviewRecordEntity::getAction, action.trim().toUpperCase());
        }
        if (decidedFrom != null) {
            wrapper.ge(ReviewRecordEntity::getDecidedAt, decidedFrom);
        }
        if (decidedTo != null) {
            wrapper.le(ReviewRecordEntity::getDecidedAt, decidedTo);
        }
        applyReviewRecordKeyword(wrapper, query);
        wrapper.orderByDesc(ReviewRecordEntity::getDecidedAt).orderByDesc(ReviewRecordEntity::getId);
        IPage<ReviewRecordEntity> pageResult =
                reviewRecordMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(
                pageResult.getTotal(),
                query.page(),
                query.pageSize(),
                toReviewRecordListRows(pageResult.getRecords()));
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.REVIEW)
    public ReviewerReviewRecordDetail getReviewRecordDetail(Long id) {
        ReviewRecordEntity record = reviewRecordMapper.selectById(id);
        if (record == null || record.getDeletedFlag() == null || record.getDeletedFlag() != 0) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Review record not found");
        }
        List<ReviewerReviewRecordListRow> rows = toReviewRecordListRows(List.of(record));
        if (rows.isEmpty()) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Review record not found");
        }
        return toReviewRecordDetail(rows.getFirst(), record);
    }

    // ── Single decisions ──

    @Override
    @Transactional
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public ReviewerSubmissionDetail approve(Long submissionId, ReviewerDecisionCommand command) {
        return decide(submissionId, "approve", command.commentText(), currentUserContext.requireUserId(), null);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public ReviewerSubmissionDetail reject(Long submissionId, ReviewerDecisionCommand command) {
        return decide(submissionId, "reject", command.commentText(), currentUserContext.requireUserId(), null);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public ReviewerSubmissionDetail returnForRevision(Long submissionId, ReviewerDecisionCommand command) {
        return decide(submissionId, "return", command.commentText(), currentUserContext.requireUserId(), null);
    }

    // ── Batch ──

    @Override
    @Transactional
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public ReviewerBatchSubmitResult submitBatchDecision(ReviewerBatchDecisionCommand command) {
        if (command.submissionIds().size() > 100) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Batch size exceeds limit of 100");
        }
        String reviewLevel = command.reviewLevel().trim();
        reviewerReviewLevelAccess.requireLevelAccess(reviewLevel, reviewerPermissions());
        List<SubmissionEntity> submissions = validateBatchSubmissions(command.submissionIds(), reviewLevel);
        String batchKey = UUID.randomUUID().toString();
        ReviewBatchOperationEntity op = new ReviewBatchOperationEntity();
        op.setBatchKey(batchKey);
        op.setTaskId(resolveBatchTaskId(submissions));
        op.setOperatorId(currentUserContext.requireUserId());
        op.setReviewLevel(reviewLevel);
        op.setBatchAction(command.action().toUpperCase());
        op.setTargetTotalCount(command.submissionIds().size());
        op.setSuccessCount(0);
        op.setFailedCount(0);
        op.setStatus("PENDING");
        op.setCreatedAt(Instant.now());
        op.setUpdatedAt(Instant.now());
        try {
            op.setCriteriaJson(objectMapper.writeValueAsString(Map.of(
                    "action", command.action(),
                    "submissionIds", command.submissionIds(),
                    "commentText", command.commentText(),
                    "reviewLevel", reviewLevel)));
        } catch (Exception ex) {
            op.setCriteriaJson("{}");
        }
        reviewBatchOperationMapper.insert(op);
        asyncTaskService.enqueue("BATCH_REVIEW", "REVIEW_BATCH", op.getId(), batchKey, 3,
                Map.of("batchOperationId", op.getId(),
                        "action", command.action(),
                        "submissionIds", command.submissionIds(),
                        "commentText", command.commentText(),
                        "operatorId", op.getOperatorId()));
        return new ReviewerBatchSubmitResult(batchKey, command.submissionIds().size(), "PENDING");
    }

    @Override
    @RequireAnyPermission({ "business:reviewer:workbench", "system:admin" })
    public ReviewBatchOperationRow getBatchOperation(String batchKey) {
        LambdaQueryWrapper<ReviewBatchOperationEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewBatchOperationEntity::getDeletedFlag, 0)
                .eq(ReviewBatchOperationEntity::getBatchKey, batchKey)
                .last("LIMIT 1");
        ReviewBatchOperationEntity op = reviewBatchOperationMapper.selectOne(wrapper);
        if (op == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Batch operation not found");
        }
        reconcileBatchOperationIfAsyncDeadLetter(op);
        return new ReviewBatchOperationRow(
                op.getId(), op.getBatchKey(), op.getBatchAction(),
                nvl(op.getTargetTotalCount()), nvl(op.getSuccessCount()), nvl(op.getFailedCount()),
                op.getStatus(), op.getCreatedAt(), op.getFinishedAt());
    }

    // ── Core decision logic (shared by single + batch) ──

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void applyHumanDecision(Long submissionId, String action, String commentText,
                                   Long operatorId, String batchKey) {
        if (!StringUtils.hasText(commentText)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Review comment is required");
        }
        requireSubmissionInStatuses(submissionId, Set.of(SubmissionStatus.HUMAN_REVIEWING.name()));
        SubmissionEntity entity = requireSubmission(submissionId);
        TaskEntity task = requireTask(entity.getTaskId());
        String workflowJson = resolveTaskWorkflowJson(task);

        // Initialize review level on first review
        if (!StringUtils.hasText(entity.getCurrentReviewLevel())) {
            entity.setCurrentReviewLevel(reviewWorkflowResolver.firstLevel(workflowJson));
            entity.setUpdatedAt(Instant.now());
            submissionMapper.updateById(entity);
        }

        String currentLevel = entity.getCurrentReviewLevel();
        reviewerReviewLevelAccess.requireLevelAccess(currentLevel, reviewerPermissions());
        if (!reviewWorkflowResolver.allowsAction(workflowJson, currentLevel, action)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Action not allowed at review level: " + currentLevel);
        }
        boolean isFinal = reviewWorkflowResolver.isFinalLevel(workflowJson, currentLevel);
        int stageNo = reviewWorkflowResolver.stageNo(workflowJson, currentLevel);

        switch (action.toLowerCase()) {
            case "approve" -> {
                if (isFinal) {
                    // Terminal approve
                    performTransitionAndRecord(entity, SubmissionEvent.APPROVE, currentLevel,
                            null, stageNo, true, commentText, operatorId, batchKey);
                } else {
                    // Non-terminal: advance to next level, stay HUMAN_REVIEWING
                    String nextLevel = reviewWorkflowResolver.nextLevel(workflowJson, currentLevel);
                    persistReviewRecord(entity, SubmissionStatus.HUMAN_REVIEWING.name(),
                            SubmissionStatus.HUMAN_REVIEWING.name(), "APPROVE",
                            currentLevel, nextLevel, stageNo, false, commentText, operatorId, batchKey);
                    entity.setCurrentReviewLevel(nextLevel);
                    entity.setNextReviewLevel(reviewWorkflowResolver.nextLevel(workflowJson, nextLevel));
                    entity.setUpdatedAt(Instant.now());
                    submissionMapper.updateById(entity);
                }
            }
            case "reject" -> performTransitionAndRecord(entity, SubmissionEvent.REJECT,
                    currentLevel, null, stageNo, true, commentText, operatorId, batchKey);
            case "return" -> performTransitionAndRecord(entity, SubmissionEvent.RETURN_FOR_REVISION,
                    currentLevel, null, stageNo, true, commentText, operatorId, batchKey);
            default -> throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Unsupported action: " + action);
        }
    }

    // ── Internal helpers ──

    private ReviewerSubmissionDetail decide(Long submissionId, String action, String commentText,
                                            Long operatorId, String batchKey) {
        applyHumanDecision(submissionId, action, commentText, operatorId, batchKey);
        return toDetail(requireSubmission(submissionId), false);
    }

    private void performTransitionAndRecord(SubmissionEntity entity, SubmissionEvent event,
                                             String reviewLevel, String nextLevel, int stageNo,
                                             boolean isFinalDecision, String commentText,
                                             Long operatorId, String batchKey) {
        String fromStatus = entity.getCurrentStatus();
        if (!submissionStateMachineService.canTransition(entity.getId(), event)) {
            throw new BusinessException(ErrorCode.SUBMISSION_STATUS_INVALID);
        }
        SubmissionStatus next = submissionStateMachineService.transition(entity.getId(), event);
        persistReviewRecord(entity, fromStatus, next.name(), mapReviewAction(event),
                reviewLevel, nextLevel, stageNo, isFinalDecision, commentText, operatorId, batchKey);
        applyReviewSideEffects(entity, event, next.name(), commentText);
    }

    private void transitionSubmission(Long submissionId, SubmissionEvent event, String commentText,
                                       Long operatorId, String batchKey) {
        SubmissionEntity current = requireSubmission(submissionId);
        String fromStatus = current.getCurrentStatus();
        if (!submissionStateMachineService.canTransition(submissionId, event)) {
            throw new BusinessException(ErrorCode.SUBMISSION_STATUS_INVALID);
        }
        SubmissionStatus next = submissionStateMachineService.transition(submissionId, event);
        persistReviewRecord(current, fromStatus, next.name(), mapReviewAction(event),
                "L1", null, 1, false, commentText, operatorId, batchKey);
    }

    private void persistReviewRecord(SubmissionEntity entity, String fromStatus, String toStatus,
                                      String action, String reviewLevel, String nextReviewLevel,
                                      int stageNo, boolean isFinalDecision,
                                      String commentText, Long operatorId, String batchKey) {
        Long versionId = entity.getCurrentVersionId();
        if (versionId == null) {
            SubmissionEntity latest = requireSubmission(entity.getId());
            versionId = latest.getCurrentVersionId();
        }

        // Compute diff
        Map<String, Object> currentData = submissionVersionReader.readSubmitDataByVersionId(versionId);
        Map<String, Object> previousData = submissionVersionReader.readPreviousSubmitData(versionId);
        List<SubmissionFieldDiff> diffs = SubmissionDiffUtil.diff(previousData, currentData);
        String diffJson = null;
        if (!diffs.isEmpty()) {
            try {
                diffJson = objectMapper.writeValueAsString(diffs);
            } catch (Exception ex) {
                log.warn("Failed to serialize review diff JSON: {}", ex.getMessage());
            }
        }

        ReviewRecordEntity record = new ReviewRecordEntity();
        record.setSubmissionId(entity.getId());
        record.setSubmissionVersionId(versionId != null ? versionId : 0L);
        record.setTaskId(entity.getTaskId());
        record.setAssignmentId(entity.getAssignmentId());
        record.setReviewerId(operatorId);
        record.setReviewLevel(reviewLevel);
        record.setReviewStageNo(stageNo);
        record.setAction(action);
        record.setFromStatus(fromStatus);
        record.setToStatus(toStatus);
        record.setReviewBatchKey(batchKey);
        record.setNextReviewLevel(nextReviewLevel);
        record.setIsFinalDecision(isFinalDecision ? 1 : 0);
        record.setCommentText(commentText == null ? "" : commentText.trim());
        record.setDiffJson(diffJson);
        record.setDecidedAt(Instant.now());
        record.setCreatedAt(Instant.now());
        record.setUpdatedAt(Instant.now());
        reviewRecordMapper.insert(record);

        SubmissionEntity latest = requireSubmission(entity.getId());
        latest.setLastReviewRecordId(record.getId());
        latest.setLastActionCode(action);
        latest.setLastActionAt(Instant.now());
        latest.setUpdatedAt(Instant.now());
        submissionMapper.updateById(latest);
    }

    private void applyReviewSideEffects(SubmissionEntity entity, SubmissionEvent event,
                                         String toStatus, String commentText) {
        SubmissionEntity latest = requireSubmission(entity.getId());
        if (event == SubmissionEvent.RETURN_FOR_REVISION) {
            latest.setLastReturnReasonText(commentText == null ? null : commentText.trim());
            latest.setRevisionRequiredAt(Instant.now());
            latest.setReturnCount((latest.getReturnCount() == null ? 0 : latest.getReturnCount()) + 1);
            // Reset review level for next round
            TaskEntity task = requireTask(latest.getTaskId());
            latest.setCurrentReviewLevel(reviewWorkflowResolver.firstLevel(resolveTaskWorkflowJson(task)));
            latest.setNextReviewLevel(null);
            resumeAssignmentAfterReviewReturn(latest.getAssignmentId());
        }
        if (isFinalDecision(toStatus)) {
            latest.setFinalizedAt(Instant.now());
        }
        latest.setUpdatedAt(Instant.now());
        submissionMapper.updateById(latest);

        if (SubmissionStatus.APPROVED.name().equals(toStatus)) {
            rewardSettlementService.recordApprovedSubmission(latest.getId());
        }
        notifyReviewParticipants(latest, event, toStatus, commentText, currentUserContext.userIdOrZero());
    }

    private void notifyReviewParticipants(
            SubmissionEntity entity,
            SubmissionEvent event,
            String toStatus,
            String commentText,
            Long operatorId) {
        Long labelerId = entity.getLabelerId();
        if (labelerId == null || labelerId < 1) {
            return;
        }
        Long senderId = operatorId == null || operatorId < 1 ? null : operatorId;
        String reviewerName = userDisplayNameResolver.resolve(senderId, "审核员");
        String linkUrl = entity.getAssignmentId() == null
                ? null
                : "/labeler/work/" + entity.getAssignmentId();
        String title = reviewNotificationTitle(event, toStatus);
        String trimmedComment = commentText == null ? "" : commentText.trim();
        String body = trimmedComment.isEmpty()
                ? reviewerName + " 更新了审核状态"
                : reviewerName + "：" + trimmedComment;
        notificationService.notifyReviewOutcome(labelerId, senderId, title, body, linkUrl, entity.getId());
        if (!trimmedComment.isEmpty()) {
            notificationService.notifyMentionsInText(
                    senderId,
                    trimmedComment,
                    reviewerName + " 在审核评论中提到了你",
                    trimmedComment,
                    linkUrl,
                    "SUBMISSION",
                    entity.getId());
        }
    }

    private static String reviewNotificationTitle(SubmissionEvent event, String toStatus) {
        return switch (event) {
            case RETURN_FOR_REVISION -> "标注已退回修改";
            case REJECT -> "标注未通过审核";
            case APPROVE -> SubmissionStatus.APPROVED.name().equals(toStatus)
                    ? "标注已通过审核"
                    : "标注进入下一审核阶段";
            default -> "审核进度更新";
        };
    }

    private boolean isFinalDecision(String toStatus) {
        return SubmissionStatus.APPROVED.name().equals(toStatus)
                || SubmissionStatus.REJECTED.name().equals(toStatus)
                || SubmissionStatus.NEEDS_REVISION.name().equals(toStatus);
    }

    private void resumeAssignmentAfterReviewReturn(Long assignmentId) {
        if (assignmentId == null) {
            return;
        }
        AssignmentEntity assignment = assignmentMapper.selectById(assignmentId);
        if (assignment == null || assignment.getDeletedFlag() == 1) {
            return;
        }
        if (AssignmentStatus.CLAIMED.name().equals(assignment.getStatus())) {
            if (assignment.getClosedAt() != null) {
                assignment.setClosedAt(null);
                assignment.setUpdatedAt(Instant.now());
                assignmentMapper.updateById(assignment);
            }
            return;
        }
        if (!AssignmentStatus.SUBMITTED.name().equals(assignment.getStatus())) {
            return;
        }
        if (assignmentStateMachineService.canTransition(assignmentId, AssignmentEvent.WITHDRAW_SUBMISSION)) {
            assignmentStateMachineService.transition(assignmentId, AssignmentEvent.WITHDRAW_SUBMISSION);
        }
        AssignmentEntity refreshed = assignmentMapper.selectById(assignmentId);
        if (refreshed == null || refreshed.getDeletedFlag() == 1) {
            return;
        }
        refreshed.setClosedAt(null);
        refreshed.setUpdatedAt(Instant.now());
        assignmentMapper.updateById(refreshed);
    }

    private String mapReviewAction(SubmissionEvent event) {
        return switch (event) {
            case APPROVE -> "APPROVE";
            case REJECT -> "REJECT";
            case RETURN_FOR_REVISION -> "RETURN";
            case AI_PASS -> "AI_PASS";
            case AI_REJECT -> "AI_REJECT";
            case AI_REQUIRE_HUMAN -> "AI_MANUAL";
            case ENTER_HUMAN_REVIEW -> "ENTER_HUMAN";
            default -> event.name();
        };
    }

    // ── Query helpers ──

    private PageResponse<ReviewerQueueRow> pageRows(
            LambdaQueryWrapper<SubmissionEntity> wrapper, ParsedListQuery query, boolean aiQueue) {
        IPage<SubmissionEntity> pageResult = submissionMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        Set<Long> failedSubmissionIds = loadFailedAiReviewSubmissionIds();
        Map<Long, ReviewerAiReviewSnapshot> aiReviewById = loadAiReviewSnapshots(pageResult.getRecords());
        List<ReviewerQueueRow> rows = pageResult.getRecords().stream()
                .map(entity -> toQueueRow(entity, failedSubmissionIds, aiReviewById, aiQueue))
                .toList();
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(), rows);
    }

    private LambdaQueryWrapper<SubmissionEntity> baseQueueWrapper(Set<String> statuses) {
        LambdaQueryWrapper<SubmissionEntity> wrapper = activeWrapper();
        wrapper.in(SubmissionEntity::getCurrentStatus, statuses);
        return wrapper;
    }

    private boolean applyQueueStatusFilter(LambdaQueryWrapper<SubmissionEntity> wrapper, String queueStatus, boolean aiQueue) {
        if (!StringUtils.hasText(queueStatus) || "all".equalsIgnoreCase(queueStatus)) {
            return false;
        }
        if (aiQueue && "failed".equalsIgnoreCase(queueStatus)) {
            List<Long> failedSubmissionIds = loadFailedAiReviewSubmissionIds().stream().toList();
            if (failedSubmissionIds.isEmpty()) {
                return true;
            }
            wrapper.in(SubmissionEntity::getId, failedSubmissionIds);
            return false;
        }
        if (aiQueue && "pending".equalsIgnoreCase(queueStatus)) {
            wrapper.in(SubmissionEntity::getCurrentStatus,
                    Set.of(SubmissionStatus.SUBMITTED.name(), SubmissionStatus.AI_REVIEWING.name()));
            List<Long> failedSubmissionIds = loadFailedAiReviewSubmissionIds().stream().toList();
            if (!failedSubmissionIds.isEmpty()) {
                wrapper.notIn(SubmissionEntity::getId, failedSubmissionIds);
            }
            return false;
        }
        Set<String> mapped = mapQueueStatusToSubmissionStatuses(queueStatus, aiQueue);
        if (mapped.isEmpty()) {
            return true;
        }
        wrapper.in(SubmissionEntity::getCurrentStatus, mapped);
        return false;
    }

    private Set<String> mapQueueStatusToSubmissionStatuses(String queueStatus, boolean aiQueue) {
        if (!aiQueue) {
            return Set.of(SubmissionStatus.HUMAN_REVIEWING.name());
        }
        return switch (queueStatus.toLowerCase()) {
            case "pending" -> Set.of(SubmissionStatus.SUBMITTED.name(), SubmissionStatus.AI_REVIEWING.name());
            case "passed" -> Set.of(SubmissionStatus.AI_PASSED.name());
            case "returned" -> Set.of(SubmissionStatus.AI_REJECTED.name());
            case "manual" -> Set.of(SubmissionStatus.HUMAN_REVIEWING.name());
            case "failed" -> Set.of(SubmissionStatus.AI_REVIEWING.name());
            default -> Set.of();
        };
    }

    private static final String AUDIT_POOL_STATUS = SubmissionStatus.HUMAN_REVIEWING.name();

    private String normalizeAuditPoolScopeType(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "scopeType is required");
        }
        return switch (raw.trim().toLowerCase()) {
            case "task", "labeler", "item" -> raw.trim().toLowerCase();
            default -> throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Unsupported audit pool scope type");
        };
    }

    private String auditPoolGroupColumn(String groupBy) {
        return switch (groupBy) {
            case "task" -> "task_id";
            case "labeler" -> "labeler_id";
            case "item" -> "item_id";
            default -> throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Unsupported audit pool groupBy");
        };
    }

    private QueryWrapper<SubmissionEntity> auditPoolBaseQueryWrapper() {
        QueryWrapper<SubmissionEntity> wrapper = new QueryWrapper<>();
        wrapper.eq("deleted_flag", 0);
        wrapper.eq("current_status", AUDIT_POOL_STATUS);
        applyDataScopeOnQueryWrapper(wrapper);
        return wrapper;
    }

    private Set<String> reviewerPermissions() {
        AuthenticatedUser user = currentUserProvider.currentUser();
        return user.permissions() != null ? user.permissions() : Set.of();
    }

    private List<ReviewWorkflowLevel> resolveWorkflowLevelsForScope(String scopeType, List<Long> scopeIds) {
        if ("task".equals(scopeType) && scopeIds != null && scopeIds.size() == 1) {
            TaskEntity task = taskMapper.selectById(scopeIds.getFirst());
            if (task != null && task.getDeletedFlag() != null && task.getDeletedFlag() == 0) {
                return reviewWorkflowResolver.parseDefinition(resolveTaskWorkflowJson(task));
            }
        }
        return reviewWorkflowResolver.parseDefinition(null);
    }

    private void applyAuditPoolLevelFilter(
            LambdaQueryWrapper<SubmissionEntity> wrapper,
            String reviewLevel,
            String scopeType,
            List<Long> scopeIds) {
        List<ReviewWorkflowLevel> workflowLevels = resolveWorkflowLevelsForScope(scopeType, scopeIds);
        String firstLevelKey = workflowLevels.getFirst().key();
        Set<String> permissions = reviewerPermissions();
        if (StringUtils.hasText(reviewLevel)) {
            String level = reviewLevel.trim();
            reviewerReviewLevelAccess.requireLevelAccess(level, permissions);
            applyAuditPoolReviewLevel(wrapper, level, firstLevelKey);
            return;
        }
        if (reviewerReviewLevelAccess.hasUnrestrictedLevels(permissions)) {
            return;
        }
        List<String> accessible =
                reviewerReviewLevelAccess.resolveAccessibleLevelKeysForFilter(workflowLevels, permissions);
        reviewerReviewLevelAccess.applyAccessibleLevels(wrapper, accessible, firstLevelKey);
    }

    private void applyAuditPoolLevelFilterOnQueryWrapper(
            QueryWrapper<SubmissionEntity> wrapper,
            String reviewLevel,
            String scopeType,
            List<Long> scopeIds) {
        List<ReviewWorkflowLevel> workflowLevels = resolveWorkflowLevelsForScope(scopeType, scopeIds);
        String firstLevelKey = workflowLevels.getFirst().key();
        Set<String> permissions = reviewerPermissions();
        if (StringUtils.hasText(reviewLevel)) {
            String level = reviewLevel.trim();
            reviewerReviewLevelAccess.requireLevelAccess(level, permissions);
            applyAuditPoolReviewLevelOnQueryWrapper(wrapper, level, firstLevelKey);
            return;
        }
        if (reviewerReviewLevelAccess.hasUnrestrictedLevels(permissions)) {
            return;
        }
        List<String> accessible =
                reviewerReviewLevelAccess.resolveAccessibleLevelKeysForFilter(workflowLevels, permissions);
        reviewerReviewLevelAccess.applyAccessibleLevelsOnQueryWrapper(wrapper, accessible, firstLevelKey);
    }

    private void applyAuditPoolReviewLevel(
            LambdaQueryWrapper<SubmissionEntity> wrapper, String level, String firstLevelKey) {
        if (level.equals(firstLevelKey)) {
            wrapper.and(w -> w.eq(SubmissionEntity::getCurrentReviewLevel, level)
                    .or()
                    .isNull(SubmissionEntity::getCurrentReviewLevel)
                    .or()
                    .eq(SubmissionEntity::getCurrentReviewLevel, ""));
        } else {
            wrapper.eq(SubmissionEntity::getCurrentReviewLevel, level);
        }
    }

    private void applyAuditPoolReviewLevelOnQueryWrapper(
            QueryWrapper<SubmissionEntity> wrapper, String level, String firstLevelKey) {
        if (level.equals(firstLevelKey)) {
            wrapper.and(w -> w.eq("current_review_level", level)
                    .or()
                    .isNull("current_review_level")
                    .or()
                    .eq("current_review_level", ""));
        } else {
            wrapper.eq("current_review_level", level);
        }
    }

    private String resolveFirstLevelForScope(String scopeType, List<Long> scopeIds) {
        if ("task".equals(scopeType) && scopeIds != null && scopeIds.size() == 1) {
            TaskEntity task = taskMapper.selectById(scopeIds.getFirst());
            if (task != null && task.getDeletedFlag() != null && task.getDeletedFlag() == 0) {
                return reviewWorkflowResolver.firstLevel(resolveTaskWorkflowJson(task));
            }
        }
        return reviewWorkflowResolver.firstLevel(null);
    }

    private long countAuditPoolPending(Long taskId, String reviewLevel, String firstLevelKey) {
        LambdaQueryWrapper<SubmissionEntity> wrapper = baseQueueWrapper(Set.of(AUDIT_POOL_STATUS));
        com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
        if (taskId != null && taskId > 0) {
            wrapper.eq(SubmissionEntity::getTaskId, taskId);
        }
        if (reviewLevel.equals(firstLevelKey)) {
            wrapper.and(w -> w.eq(SubmissionEntity::getCurrentReviewLevel, reviewLevel)
                    .or()
                    .isNull(SubmissionEntity::getCurrentReviewLevel)
                    .or()
                    .eq(SubmissionEntity::getCurrentReviewLevel, ""));
        } else {
            wrapper.eq(SubmissionEntity::getCurrentReviewLevel, reviewLevel);
        }
        return submissionMapper.selectCount(wrapper);
    }

    private void applyDataScopeOnQueryWrapper(QueryWrapper<?> wrapper) {
        com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
    }

    private void applyKeywordOnQueryWrapper(QueryWrapper<SubmissionEntity> wrapper, ParsedListQuery query) {
        if (query.keyword() == null || query.keyword().isBlank()) {
            return;
        }
        String keyword = query.keyword().trim();
        List<Long> taskIds = findTaskIdsByKeyword(keyword);
        List<Long> labelerIds = findLabelerIdsByKeyword(keyword);
        wrapper.and(w -> {
            w.like("id", keyword).or().like("task_id", keyword);
            if (!taskIds.isEmpty()) {
                w.or().in("task_id", taskIds);
            }
            if (!labelerIds.isEmpty()) {
                w.or().in("labeler_id", labelerIds);
            }
        });
    }

    private void applyAuditPoolScopes(LambdaQueryWrapper<SubmissionEntity> wrapper, String scopeType, List<Long> scopeIds) {
        switch (scopeType) {
            case "task" -> wrapper.in(SubmissionEntity::getTaskId, scopeIds);
            case "labeler" -> wrapper.in(SubmissionEntity::getLabelerId, scopeIds);
            case "item" -> wrapper.in(SubmissionEntity::getItemId, scopeIds);
            default -> throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Unsupported audit pool scope type");
        }
    }

    private AuditPoolGroupRow toAuditPoolGroupRow(String groupBy, Map<String, Object> row) {
        Long scopeId = toLong(row.get("scope_id"));
        long submissionCount = toLong(row.get("submission_count"));
        Instant lastActivityAt = toInstant(row.get("last_activity_at"));
        return new AuditPoolGroupRow(
                groupBy,
                scopeId,
                resolveAuditPoolGroupLabel(groupBy, scopeId),
                resolveAuditPoolGroupSubtitle(groupBy, scopeId),
                submissionCount,
                lastActivityAt);
    }

    private String resolveAuditPoolGroupLabel(String groupBy, Long scopeId) {
        if (scopeId == null) {
            return "—";
        }
        return switch (groupBy) {
            case "task" -> {
                TaskEntity task = taskMapper.selectById(scopeId);
                yield task == null ? "任务 " + scopeId : task.getTitle();
            }
            case "labeler" -> userDisplayNameResolver.resolve(scopeId, "标注员 " + scopeId);
            case "item" -> {
                TaskItemEntity item = taskItemMapper.selectById(scopeId);
                if (item == null) {
                    yield "题目 " + scopeId;
                }
                TaskEntity task = requireTask(item.getTaskId());
                yield formatTitle(task.getTitle(), item.getSeqNo());
            }
            default -> String.valueOf(scopeId);
        };
    }

    private String resolveAuditPoolGroupSubtitle(String groupBy, Long scopeId) {
        if (scopeId == null) {
            return null;
        }
        return switch (groupBy) {
            case "task" -> {
                TaskEntity task = taskMapper.selectById(scopeId);
                yield task == null ? null : "任务 ID " + scopeId;
            }
            case "labeler" -> "标注员 ID " + scopeId;
            case "item" -> {
                TaskItemEntity item = taskItemMapper.selectById(scopeId);
                yield item == null ? null : "题目 ID " + scopeId;
            }
            default -> null;
        };
    }

    private long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private Instant toInstant(Object value) {
        if (value == null) {
            return Instant.EPOCH;
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toInstant();
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.atZone(ZoneId.systemDefault()).toInstant();
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant();
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return Instant.EPOCH;
        }
        try {
            return Instant.parse(text);
        } catch (DateTimeParseException ignored) {
            // MyBatis selectMaps 聚合 MAX(updated_at) 常为无时区本地时间字符串
            return LocalDateTime.parse(text).atZone(ZoneId.systemDefault()).toInstant();
        }
    }

    private void applyKeyword(LambdaQueryWrapper<SubmissionEntity> wrapper, ParsedListQuery query) {
        if (query.keyword() == null || query.keyword().isBlank()) {
            return;
        }
        String keyword = query.keyword().trim();
        List<Long> taskIds = findTaskIdsByKeyword(keyword);
        List<Long> labelerIds = findLabelerIdsByKeyword(keyword);
        wrapper.and(w -> {
            w.like(SubmissionEntity::getId, keyword).or().like(SubmissionEntity::getTaskId, keyword);
            if (!taskIds.isEmpty()) {
                w.or().in(SubmissionEntity::getTaskId, taskIds);
            }
            if (!labelerIds.isEmpty()) {
                w.or().in(SubmissionEntity::getLabelerId, labelerIds);
            }
        });
    }

    private List<Long> findTaskIdsByKeyword(String keyword) {
        LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskEntity::getDeletedFlag, 0)
                .and(w -> w.like(TaskEntity::getTitle, keyword).or().like(TaskEntity::getTaskCode, keyword));
        return taskMapper.selectList(wrapper).stream().map(TaskEntity::getId).toList();
    }

    private List<Long> findLabelerIdsByKeyword(String keyword) {
        LambdaQueryWrapper<UserEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserEntity::getDeletedFlag, 0)
                .and(w -> w.like(UserEntity::getUsername, keyword).or().like(UserEntity::getDisplayName, keyword));
        List<Long> ids = userMapper.selectList(wrapper).stream().map(UserEntity::getId).toList();
        return ids.isEmpty() ? Collections.emptyList() : ids;
    }

    // ── Mapping ──

    private ReviewerQueueRow toQueueRow(
            SubmissionEntity entity,
            Set<Long> failedSubmissionIds,
            Map<Long, ReviewerAiReviewSnapshot> aiReviewById,
            boolean aiQueue) {
        TaskEntity task = requireTask(entity.getTaskId());
        TaskItemEntity item = requireTaskItem(entity.getItemId());
        String labelerName = userDisplayNameResolver.resolve(entity.getLabelerId(), "—");
        ReviewerAiReviewSnapshot aiReview = entity.getLastAiReviewId() == null
                ? null
                : aiReviewById.get(entity.getLastAiReviewId());
        String workflowJson = resolveTaskWorkflowJson(task);
        String effectiveLevel = resolveEffectiveReviewLevel(entity, workflowJson);
        return new ReviewerQueueRow(
                entity.getId(),
                formatSubmissionCode(entity.getId()),
                formatTitle(task.getTitle(), item.getSeqNo()),
                labelerName,
                entity.getLastSubmittedAt(),
                entity.getCurrentStatus(),
                aiQueue
                        ? mapAiQueueStatus(entity.getCurrentStatus(), failedSubmissionIds.contains(entity.getId()))
                        : mapAuditQueueStatus(entity.getCurrentStatus()),
                aiReview == null ? null : aiReview.totalScore(),
                aiReview == null ? null : aiReview.verdict(),
                task.getId(),
                task.getTitle(),
                entity.getLabelerId(),
                item.getId(),
                item.getSeqNo(),
                effectiveLevel,
                reviewWorkflowResolver.labelFor(workflowJson, effectiveLevel));
    }

    private String resolveEffectiveReviewLevel(SubmissionEntity entity, String workflowJson) {
        if (StringUtils.hasText(entity.getCurrentReviewLevel())) {
            return entity.getCurrentReviewLevel();
        }
        return reviewWorkflowResolver.firstLevel(workflowJson);
    }

    private ReviewerSubmissionDetail toDetail(SubmissionEntity entity, boolean aiQueue) {
        TaskEntity task = requireTask(entity.getTaskId());
        TaskItemEntity item = requireTaskItem(entity.getItemId());
        TemplateVersionEntity version = requireTemplateVersion(entity.getCurrentTemplateVersionId());
        ReviewRecordEntity lastReview = findLastReview(entity.getId());
        String lastReviewerName = lastReview == null ? null : userDisplayNameResolver.resolve(lastReview.getReviewerId());

        Map<String, Object> currentSubmitData = submissionVersionReader.readSubmitDataByVersionId(entity.getCurrentVersionId());
        Map<String, Object> previousSubmitData = submissionVersionReader.readPreviousSubmitData(entity.getCurrentVersionId());
        List<SubmissionFieldDiff> diffs = SubmissionDiffUtil.diff(previousSubmitData, currentSubmitData);

        Set<Long> failedSubmissionIds = loadFailedAiReviewSubmissionIds();
        ReviewerAiReviewSnapshot aiReview = aiReviewRecordReader.toSnapshot(entity.getLastAiReviewId(), version.getId());
        List<ReviewerTimelineEntry> timeline = mapReviewerTimeline(
                submissionTimelineAssembler.buildLifecycleTimeline(entity.getId(), entity.getAssignmentId()));

        String workflowJson = resolveTaskWorkflowJson(task);
        String effectiveLevel = resolveEffectiveReviewLevel(entity, workflowJson);
        String nextLevel = entity.getNextReviewLevel();
        if (!StringUtils.hasText(nextLevel)) {
            nextLevel = reviewWorkflowResolver.nextLevel(workflowJson, effectiveLevel);
        }

        return new ReviewerSubmissionDetail(
                entity.getId(),
                formatSubmissionCode(entity.getId()),
                formatTitle(task.getTitle(), item.getSeqNo()),
                userDisplayNameResolver.resolve(entity.getLabelerId(), "—"),
                entity.getLastSubmittedAt(),
                entity.getCurrentStatus(),
                aiQueue ? mapAiQueueStatus(entity.getCurrentStatus(), failedSubmissionIds.contains(entity.getId()))
                        : mapAuditQueueStatus(entity.getCurrentStatus()),
                task.getId(),
                task.getTitle(),
                item.getId(),
                item.getSeqNo(),
                readMap(item.getPayloadJson()),
                version.getId(),
                version.getVersionNo(),
                FormSchemaRuntimeSanitizer.sanitizeForClient(objectMapper, version.getSchemaJson()),
                currentSubmitData,
                lastReview == null ? entity.getLastReturnReasonText() : lastReview.getCommentText(),
                lastReview == null ? null : lastReview.getDecidedAt(),
                lastReviewerName,
                previousSubmitData.isEmpty() ? null : previousSubmitData,
                diffs.isEmpty() ? null : diffs,
                effectiveLevel,
                nextLevel,
                reviewWorkflowResolver.stageNo(workflowJson, effectiveLevel),
                reviewWorkflowResolver.labelFor(workflowJson, effectiveLevel),
                reviewWorkflowResolver.isFinalLevel(workflowJson, effectiveLevel),
                toReviewWorkflowLevelDtos(workflowJson),
                aiReview,
                timeline);
    }

    private List<ReviewWorkflowLevelDto> toReviewWorkflowLevelDtos(String workflowJson) {
        return reviewWorkflowResolver.parseDefinition(workflowJson).stream()
                .map(level -> new ReviewWorkflowLevelDto(
                        level.key(),
                        level.label(),
                        reviewWorkflowResolver.stageNo(workflowJson, level.key()),
                        reviewWorkflowResolver.isFinalLevel(workflowJson, level.key()),
                        level.actions()))
                .toList();
    }

    private List<ReviewerTimelineEntry> mapReviewerTimeline(List<SubmissionTimelineEntry> entries) {
        if (entries == null || entries.isEmpty()) {
            return List.of();
        }
        return entries.stream()
                .map(entry -> new ReviewerTimelineEntry(
                        entry.id(),
                        entry.stage(),
                        entry.label(),
                        entry.detail(),
                        entry.occurredAt(),
                        entry.tone()))
                .toList();
    }

    private Map<Long, ReviewerAiReviewSnapshot> loadAiReviewSnapshots(List<SubmissionEntity> entities) {
        List<Long> reviewIds = entities.stream()
                .map(SubmissionEntity::getLastAiReviewId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        if (reviewIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> versionByReviewId = new HashMap<>();
        Map<Long, SubmissionEntity> entityByReviewId = entities.stream()
                .filter(entity -> entity.getLastAiReviewId() != null)
                .collect(Collectors.toMap(SubmissionEntity::getLastAiReviewId, Function.identity(), (a, b) -> a));
        entityByReviewId.forEach((reviewId, entity) -> versionByReviewId.put(reviewId, entity.getCurrentTemplateVersionId()));
        return aiReviewRecordReader.loadSnapshotsByIds(reviewIds, versionByReviewId);
    }

    private Set<Long> loadFailedAiReviewSubmissionIds() {
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                .eq(AsyncTaskEntity::getTaskType, "AI_REVIEW")
                .eq(AsyncTaskEntity::getBizType, "SUBMISSION")
                .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.DEAD_LETTER);
        return asyncTaskMapper.selectList(wrapper).stream()
                .map(AsyncTaskEntity::getBizId)
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private AsyncTaskEntity findLatestFailedAiReviewTask(Long submissionId) {
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                .eq(AsyncTaskEntity::getTaskType, "AI_REVIEW")
                .eq(AsyncTaskEntity::getBizType, "SUBMISSION")
                .eq(AsyncTaskEntity::getBizId, submissionId)
                .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.DEAD_LETTER)
                .orderByDesc(AsyncTaskEntity::getUpdatedAt)
                .last("LIMIT 1");
        return asyncTaskMapper.selectOne(wrapper);
    }

    private void resetAsyncTaskToPending(AsyncTaskEntity task) {
        task.setStatus(AsyncTaskStatus.PENDING);
        task.setManualRetryCount(task.getManualRetryCount() == null ? 1 : task.getManualRetryCount() + 1);
        task.setWorkerId(null);
        task.setLockedAt(null);
        task.setStartedAt(null);
        task.setFinishedAt(null);
        task.setCanceledAt(null);
        task.setDeadLetteredAt(null);
        task.setLastErrorCode(null);
        task.setLastErrorMessage(null);
        task.setRetryCount(0);
        task.setNextRunAt(Instant.now());
        task.setUpdatedAt(Instant.now());
        asyncTaskMapper.updateById(task);
    }

    private String mapAiQueueStatus(String submissionStatus, boolean failedAsyncTask) {
        if (failedAsyncTask && SubmissionStatus.AI_REVIEWING.name().equals(submissionStatus)) {
            return "failed";
        }
        return switch (SubmissionStatus.valueOf(submissionStatus)) {
            case SUBMITTED, AI_REVIEWING -> "pending";
            case AI_PASSED -> "passed";
            case AI_REJECTED -> "returned";
            case HUMAN_REVIEWING -> "manual";
            default -> "failed";
        };
    }

    private String mapAuditQueueStatus(String submissionStatus) {
        return switch (SubmissionStatus.valueOf(submissionStatus)) {
            case HUMAN_REVIEWING -> "pending";
            case APPROVED -> "approved";
            case REJECTED -> "rejected";
            case NEEDS_REVISION -> "returned";
            default -> submissionStatus.toLowerCase();
        };
    }

    private List<ReviewerReviewRecordListRow> toReviewRecordListRows(List<ReviewRecordEntity> records) {
        if (records == null || records.isEmpty()) {
            return List.of();
        }
        Set<Long> submissionIds = records.stream().map(ReviewRecordEntity::getSubmissionId).collect(Collectors.toSet());
        Set<Long> taskIds = records.stream().map(ReviewRecordEntity::getTaskId).collect(Collectors.toSet());
        Map<Long, SubmissionEntity> submissionById = submissionMapper.selectBatchIds(submissionIds).stream()
                .filter(entity -> entity.getDeletedFlag() == 0)
                .collect(Collectors.toMap(SubmissionEntity::getId, Function.identity(), (left, right) -> left));
        Map<Long, TaskEntity> taskById = taskMapper.selectBatchIds(taskIds).stream()
                .filter(entity -> entity.getDeletedFlag() == 0)
                .collect(Collectors.toMap(TaskEntity::getId, Function.identity(), (left, right) -> left));
        Set<Long> itemIds = submissionById.values().stream()
                .map(SubmissionEntity::getItemId)
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toSet());
        Map<Long, TaskItemEntity> itemById = itemIds.isEmpty()
                ? Map.of()
                : taskItemMapper.selectBatchIds(itemIds).stream()
                        .filter(entity -> entity.getDeletedFlag() == 0)
                        .collect(Collectors.toMap(TaskItemEntity::getId, Function.identity(), (left, right) -> left));
        Set<Long> labelerIds = submissionById.values().stream()
                .map(SubmissionEntity::getLabelerId)
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toSet());
        Map<Long, String> labelerNames = labelerIds.stream()
                .collect(Collectors.toMap(
                        Function.identity(),
                        id -> userDisplayNameResolver.resolve(id, "—"),
                        (left, right) -> left));
        return records.stream()
                .map(record -> toReviewRecordListRow(
                        record,
                        submissionById.get(record.getSubmissionId()),
                        taskById.get(record.getTaskId()),
                        itemById,
                        labelerNames))
                .toList();
    }

    private ReviewerReviewRecordDetail toReviewRecordDetail(
            ReviewerReviewRecordListRow base, ReviewRecordEntity record) {
        SubmissionEntity submission = record.getSubmissionId() == null
                ? null
                : submissionMapper.selectById(record.getSubmissionId());
        TaskItemEntity item = submission == null || submission.getItemId() == null
                ? null
                : taskItemMapper.selectById(submission.getItemId());
        TemplateVersionEntity version = submission == null || submission.getCurrentTemplateVersionId() == null
                ? null
                : templateVersionMapper.selectById(submission.getCurrentTemplateVersionId());
        String templateSchemaJson = version == null || version.getSchemaJson() == null
                ? null
                : FormSchemaRuntimeSanitizer.sanitizeForClient(objectMapper, version.getSchemaJson());
        Map<String, Object> draftData = submission == null ? Map.of() : readMap(submission.getDraftDataJson());
        String itemPayloadJson = item == null ? null : item.getPayloadJson();
        Map<String, Object> itemPayload = itemPayloadJson == null || itemPayloadJson.isBlank()
                ? Map.of()
                : TaskPayloadPreviewSupport.toPayloadMap(objectMapper, itemPayloadJson);
        Map<String, Object> payloadPreview = itemPayloadJson == null || itemPayloadJson.isBlank()
                ? Map.of()
                : TaskPayloadPreviewSupport.toPayloadPreview(objectMapper, itemPayloadJson);
        String draftPreviewText = templateSchemaJson == null || submission == null
                ? null
                : FormSchemaDraftPreviewSupport.toPreviewText(
                        objectMapper, templateSchemaJson, submission.getDraftDataJson());
        List<SubmissionTimelineEntry> lifecycleTimeline = submission == null
                ? List.of()
                : submissionTimelineAssembler.buildLifecycleTimeline(submission.getId(), submission.getAssignmentId());
        return new ReviewerReviewRecordDetail(
                base.id(),
                base.submissionId(),
                base.submissionCode(),
                base.title(),
                base.taskId(),
                base.taskName(),
                base.labelerId(),
                base.labelerName(),
                base.reviewLevel(),
                base.reviewLevelLabel(),
                base.reviewStageNo(),
                base.action(),
                base.fromStatus(),
                base.toStatus(),
                base.commentText(),
                base.reviewerId(),
                base.reviewerName(),
                base.decidedAt(),
                base.isFinalDecision(),
                item == null ? null : item.getId(),
                item == null ? null : item.getSeqNo(),
                item == null ? null : item.getSourceItemKey(),
                payloadPreview,
                draftPreviewText,
                submission == null ? null : submission.getCurrentRoundNo(),
                templateSchemaJson,
                draftData,
                itemPayload,
                lifecycleTimeline);
    }

    private ReviewerReviewRecordListRow toReviewRecordListRow(
            ReviewRecordEntity record,
            SubmissionEntity submission,
            TaskEntity task,
            Map<Long, TaskItemEntity> itemById,
            Map<Long, String> labelerNames) {
        String workflowJson = task == null ? null : resolveTaskWorkflowJson(task);
        String level = record.getReviewLevel() == null ? "" : record.getReviewLevel();
        TaskItemEntity item = submission == null || submission.getItemId() == null
                ? null
                : itemById.get(submission.getItemId());
        String taskTitle = task == null ? "未命名任务" : task.getTitle();
        Integer seqNo = item == null ? null : item.getSeqNo();
        Long labelerId = submission == null ? null : submission.getLabelerId();
        String labelerName = labelerId == null
                ? "—"
                : labelerNames.getOrDefault(labelerId, "—");
        return new ReviewerReviewRecordListRow(
                record.getId(),
                record.getSubmissionId(),
                formatSubmissionCode(record.getSubmissionId()),
                formatTitle(taskTitle, seqNo),
                record.getTaskId(),
                taskTitle,
                labelerId,
                labelerName,
                level,
                reviewWorkflowResolver.labelFor(workflowJson, level),
                record.getReviewStageNo(),
                record.getAction(),
                record.getFromStatus(),
                record.getToStatus(),
                record.getCommentText(),
                record.getReviewerId(),
                userDisplayNameResolver.resolve(record.getReviewerId(), "—"),
                record.getDecidedAt(),
                record.getIsFinalDecision() != null && record.getIsFinalDecision() == 1);
    }

    private void applyReviewRecordKeyword(LambdaQueryWrapper<ReviewRecordEntity> wrapper, ParsedListQuery query) {
        if (query.keyword() == null || query.keyword().isBlank()) {
            return;
        }
        String keyword = query.keyword().trim();
        List<Long> taskIds = findTaskIdsByKeyword(keyword);
        List<Long> labelerIds = findLabelerIdsByKeyword(keyword);
        List<Long> submissionIds = findSubmissionIdsByKeyword(keyword, labelerIds);
        wrapper.and(w -> {
            w.like(ReviewRecordEntity::getCommentText, keyword);
            try {
                long submissionId = Long.parseLong(keyword);
                w.or().eq(ReviewRecordEntity::getSubmissionId, submissionId);
            } catch (NumberFormatException ignored) {
            }
            if (!taskIds.isEmpty()) {
                w.or().in(ReviewRecordEntity::getTaskId, taskIds);
            }
            if (!submissionIds.isEmpty()) {
                w.or().in(ReviewRecordEntity::getSubmissionId, submissionIds);
            }
        });
    }

    private List<Long> findSubmissionIdsByKeyword(String keyword, List<Long> labelerIds) {
        LambdaQueryWrapper<SubmissionEntity> wrapper = activeWrapper();
        wrapper.and(w -> {
            w.like(SubmissionEntity::getId, keyword);
            if (!labelerIds.isEmpty()) {
                w.or().in(SubmissionEntity::getLabelerId, labelerIds);
            }
        });
        return submissionMapper.selectList(wrapper).stream().map(SubmissionEntity::getId).toList();
    }

    private List<SubmissionEntity> validateBatchSubmissions(List<Long> submissionIds, String expectedReviewLevel) {
        List<SubmissionEntity> submissions = new ArrayList<>();
        for (Long submissionId : submissionIds) {
            SubmissionEntity entity = requireSubmission(submissionId);
            if (!SubmissionStatus.HUMAN_REVIEWING.name().equals(entity.getCurrentStatus())) {
                throw new BusinessException(
                        ErrorCode.SUBMISSION_STATUS_INVALID,
                        "Submission is not in human review: " + submissionId);
            }
            TaskEntity task = requireTask(entity.getTaskId());
            String effectiveLevel = resolveEffectiveReviewLevel(entity, resolveTaskWorkflowJson(task));
            if (!expectedReviewLevel.equals(effectiveLevel)) {
                throw new BusinessException(
                        ErrorCode.VALIDATION_ERROR,
                        "Submission " + submissionId + " is at review level "
                                + effectiveLevel + ", expected " + expectedReviewLevel);
            }
            submissions.add(entity);
        }
        return submissions;
    }

    private static Long resolveBatchTaskId(List<SubmissionEntity> submissions) {
        if (submissions == null || submissions.isEmpty()) {
            return 0L;
        }
        Set<Long> taskIds = submissions.stream().map(SubmissionEntity::getTaskId).collect(Collectors.toSet());
        return taskIds.size() == 1 ? taskIds.iterator().next() : 0L;
    }

    private ReviewerReviewRecordRow toReviewRecordRow(ReviewRecordEntity record, String workflowJson) {
        String level = record.getReviewLevel() == null ? "" : record.getReviewLevel();
        return new ReviewerReviewRecordRow(
                record.getId(),
                level,
                reviewWorkflowResolver.labelFor(workflowJson, level),
                record.getReviewStageNo(),
                record.getAction(),
                record.getFromStatus(),
                record.getToStatus(),
                record.getCommentText(),
                userDisplayNameResolver.resolve(record.getReviewerId(), "—"),
                record.getDecidedAt(),
                record.getIsFinalDecision() != null && record.getIsFinalDecision() == 1,
                record.getNextReviewLevel());
    }

    private ReviewRecordEntity findLastReview(Long submissionId) {
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0)
                .eq(ReviewRecordEntity::getSubmissionId, submissionId)
                .orderByDesc(ReviewRecordEntity::getDecidedAt)
                .last("LIMIT 1");
        return reviewRecordMapper.selectOne(wrapper);
    }

    // ── Entity loaders ──

    private SubmissionEntity requireSubmission(Long submissionId) {
        SubmissionEntity entity = requireNotDeleted(submissionMapper.selectById(submissionId), ErrorCode.SUBMISSION_NOT_FOUND);
        AuthenticatedUser user = currentUserProvider.currentUser();
        reviewerTaskMemberAccess.requireTaskAccess(
                entity.getTaskId(),
                user.userId(),
                user.roles() != null ? user.roles() : Set.of(),
                user.permissions());
        return entity;
    }

    private SubmissionEntity requireSubmissionInStatuses(Long submissionId, Set<String> statuses) {
        SubmissionEntity entity = requireSubmission(submissionId);
        if (!statuses.contains(entity.getCurrentStatus())) {
            throw new BusinessException(ErrorCode.SUBMISSION_STATUS_INVALID);
        }
        return entity;
    }

    private String resolveTaskWorkflowJson(TaskEntity task) {
        if (task == null) {
            return null;
        }
        if (StringUtils.hasText(task.getReviewWorkflowJson())) {
            return task.getReviewWorkflowJson();
        }
        if (task.getCurrentTemplateVersionId() == null) {
            return null;
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(task.getCurrentTemplateVersionId());
        if (version == null || version.getDeletedFlag() == 1) {
            return null;
        }
        return version.getReviewWorkflowJson();
    }

    private TaskEntity requireTask(Long taskId) {
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        return task;
    }

    private TaskItemEntity requireTaskItem(Long itemId) {
        TaskItemEntity item = taskItemMapper.selectById(itemId);
        if (item == null || item.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Task item not found");
        }
        return item;
    }

    private TemplateVersionEntity requireTemplateVersion(Long versionId) {
        TemplateVersionEntity version = templateVersionMapper.selectById(versionId);
        if (version == null || version.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
        }
        return version;
    }

    private String formatSubmissionCode(Long submissionId) {
        return "S-" + submissionId;
    }

    private String formatTitle(String taskTitle, Integer seqNo) {
        String title = taskTitle == null ? "任务" : taskTitle;
        return seqNo == null ? title : title + " #" + seqNo;
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse review JSON: {}", ex.getMessage());
            return Map.of();
        }
    }

    private void reconcileBatchOperationIfAsyncDeadLetter(ReviewBatchOperationEntity op) {
        if (!"PENDING".equals(op.getStatus()) && !"RUNNING".equals(op.getStatus())) {
            return;
        }
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                .eq(AsyncTaskEntity::getTaskType, "BATCH_REVIEW")
                .eq(AsyncTaskEntity::getBizKey, op.getBatchKey())
                .orderByDesc(AsyncTaskEntity::getId)
                .last("LIMIT 1");
        AsyncTaskEntity task = asyncTaskMapper.selectOne(wrapper);
        if (task == null || !AsyncTaskStatus.DEAD_LETTER.equals(task.getStatus())) {
            return;
        }
        int target = nvl(op.getTargetTotalCount());
        op.setStatus("FAILED");
        op.setSuccessCount(0);
        op.setFailedCount(target);
        op.setFinishedAt(Instant.now());
        op.setUpdatedAt(Instant.now());
        if (StringUtils.hasText(task.getLastErrorMessage())) {
            op.setFailureSummaryJson(task.getLastErrorMessage());
        }
        reviewBatchOperationMapper.updateById(op);
    }

    private static int nvl(Integer v) {
        return v == null ? 0 : v;
    }
}
