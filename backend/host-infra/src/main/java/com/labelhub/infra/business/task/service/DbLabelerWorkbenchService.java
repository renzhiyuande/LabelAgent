package com.labelhub.infra.business.task.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.business.LabelerWorkbenchService;
import com.labelhub.core.business.distribute.DistributeStrategy;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.form.TemplateSubmissionDataValidator;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.business.assignment.workflow.AssignmentStateMachineService;
import com.labelhub.infra.business.display.TaskPayloadPreviewSupport;
import com.labelhub.infra.business.display.support.FormSchemaRuntimeSanitizer;
import com.labelhub.infra.business.display.assembler.AssignmentSummaryAssembler;
import com.labelhub.infra.business.display.assembler.SubmissionSummaryAssembler;
import com.labelhub.infra.business.display.assembler.SubmissionTimelineAssembler;
import com.labelhub.infra.business.submission.assembler.SubmissionAppealAssembler;
import com.labelhub.infra.business.submission.support.LabelerSubmissionAccessSupport;
import com.labelhub.infra.business.submission.support.SubmissionCurrentSupport;
import com.labelhub.infra.business.submission.support.SubmissionSupersedeReason;
import com.labelhub.infra.business.submission.workflow.SubmissionAppealLifecycle;
import com.labelhub.infra.business.submission.workflow.SubmissionReturnForRevisionLifecycle;
import com.labelhub.infra.business.submission.workflow.SubmissionSubmitLifecycle;
import com.labelhub.infra.business.submission.workflow.SubmissionWithdrawLifecycle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.labelhub.infra.business.task.workflow.LabelerClaimExecutor;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.spec.SubmissionQuerySpec;
import com.labelhub.infra.persistence.entity.AppealBatchOperationEntity;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AppealBatchOperationMapper;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.business.AbstractDbService;
import com.labelhub.infra.statemachine.AssignmentStatus;
import com.labelhub.infra.statemachine.SubmissionStatus;
import java.time.Instant;
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
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbLabelerWorkbenchService extends AbstractDbService<SubmissionEntity> implements LabelerWorkbenchService {
    private static final Logger log = LoggerFactory.getLogger(DbLabelerWorkbenchService.class);
    private static final String TASK_PUBLISHED = "PUBLISHED";
    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;
    private final AssignmentMapper assignmentMapper;
    private final SubmissionMapper submissionMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final AssignmentStateMachineService assignmentStateMachineService;
    private final SubmissionSubmitLifecycle submissionSubmitLifecycle;
    private final SubmissionWithdrawLifecycle submissionWithdrawLifecycle;
    private final SubmissionReturnForRevisionLifecycle submissionReturnForRevisionLifecycle;
    private final SubmissionAppealLifecycle submissionAppealLifecycle;
    private final LabelerClaimExecutor labelerClaimExecutor;
    private final CurrentUserContext currentUserContext;
    private final MybatisQueryApplier queryApplier;
    private final ObjectMapper objectMapper;
    private final AssignmentSummaryAssembler summaryAssembler;
    private final SubmissionSummaryAssembler submissionSummaryAssembler;
    private final SubmissionAppealAssembler submissionAppealAssembler;
    private final SubmissionTimelineAssembler submissionTimelineAssembler;
    private final UserDisplayNameResolver userDisplayNameResolver;
    private final AsyncTaskService asyncTaskService;
    private final AppealBatchOperationMapper appealBatchOperationMapper;
    private final LabelerSubmissionAccessSupport labelerSubmissionAccessSupport;
    private final SubmissionCurrentSupport submissionCurrentSupport;
    private final ReviewRecordMapper reviewRecordMapper;
    private final TemplateSubmissionDataValidator templateSubmissionDataValidator;

    public DbLabelerWorkbenchService(
            TaskMapper taskMapper,
            TaskItemMapper taskItemMapper,
            AssignmentMapper assignmentMapper,
            SubmissionMapper submissionMapper,
            TemplateVersionMapper templateVersionMapper,
            AssignmentStateMachineService assignmentStateMachineService,
            SubmissionSubmitLifecycle submissionSubmitLifecycle,
            SubmissionWithdrawLifecycle submissionWithdrawLifecycle,
            SubmissionReturnForRevisionLifecycle submissionReturnForRevisionLifecycle,
            SubmissionAppealLifecycle submissionAppealLifecycle,
            LabelerClaimExecutor labelerClaimExecutor,
            CurrentUserContext currentUserContext,
            MybatisQueryApplier queryApplier,
            ObjectMapper objectMapper,
            AssignmentSummaryAssembler summaryAssembler,
            SubmissionSummaryAssembler submissionSummaryAssembler,
            SubmissionAppealAssembler submissionAppealAssembler,
            SubmissionTimelineAssembler submissionTimelineAssembler,
            UserDisplayNameResolver userDisplayNameResolver,
            AsyncTaskService asyncTaskService,
            AppealBatchOperationMapper appealBatchOperationMapper,
            LabelerSubmissionAccessSupport labelerSubmissionAccessSupport,
            SubmissionCurrentSupport submissionCurrentSupport,
            ReviewRecordMapper reviewRecordMapper,
            TemplateSubmissionDataValidator templateSubmissionDataValidator) {
        this.taskMapper = taskMapper;
        this.taskItemMapper = taskItemMapper;
        this.assignmentMapper = assignmentMapper;
        this.submissionMapper = submissionMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.assignmentStateMachineService = assignmentStateMachineService;
        this.submissionSubmitLifecycle = submissionSubmitLifecycle;
        this.submissionWithdrawLifecycle = submissionWithdrawLifecycle;
        this.submissionReturnForRevisionLifecycle = submissionReturnForRevisionLifecycle;
        this.submissionAppealLifecycle = submissionAppealLifecycle;
        this.labelerClaimExecutor = labelerClaimExecutor;
        this.currentUserContext = currentUserContext;
        this.queryApplier = queryApplier;
        this.objectMapper = objectMapper;
        this.summaryAssembler = summaryAssembler;
        this.submissionSummaryAssembler = submissionSummaryAssembler;
        this.submissionAppealAssembler = submissionAppealAssembler;
        this.submissionTimelineAssembler = submissionTimelineAssembler;
        this.userDisplayNameResolver = userDisplayNameResolver;
        this.asyncTaskService = asyncTaskService;
        this.appealBatchOperationMapper = appealBatchOperationMapper;
        this.labelerSubmissionAccessSupport = labelerSubmissionAccessSupport;
        this.submissionCurrentSupport = submissionCurrentSupport;
        this.reviewRecordMapper = reviewRecordMapper;
        this.templateSubmissionDataValidator = templateSubmissionDataValidator;
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public PageResponse<LabelerMarketTaskSummary> listMarket(ParsedListQuery query) {
        LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskEntity::getDeletedFlag, 0).eq(TaskEntity::getStatus, TASK_PUBLISHED);
        if (query.keyword() != null && !query.keyword().isBlank()) {
            String keyword = query.keyword().trim();
            wrapper.and(w -> w.like(TaskEntity::getTitle, keyword).or().like(TaskEntity::getTaskCode, keyword));
        }
        for (ParsedFilter filter : query.filters()) {
            if ("sceneCode".equals(filter.field()) && filter.value() != null) {
                wrapper.eq(TaskEntity::getSceneCode, String.valueOf(filter.value()));
            }
        }
        // 在数据库层过滤非 ASSIGN 任务并分页，避免全表扫描 + 内存分页
        wrapper.ne(TaskEntity::getDistributeStrategy, DistributeStrategy.ASSIGN);
        wrapper.orderByDesc(TaskEntity::getPublishedAt);
        var page = taskMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        List<LabelerMarketTaskSummary> claimable = page.getRecords().stream()
                .map(this::toMarketSummary)
                .filter(LabelerMarketTaskSummary::canClaim)
                .toList();
        return PageResponse.of(page.getTotal(), query.page(), query.pageSize(), claimable);
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public LabelerMarketTaskSummary getMarketTask(Long taskId) {
        TaskEntity task = requirePublishedTask(taskId);
        return toMarketSummary(task);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:labeler:workbench" })
    public LabelerClaimResult claimTask(Long taskId) {
        LabelerClaimBatchResult batch = claimTaskBatch(taskId, 1);
        LabelerClaimBatchItem item = batch.items().getFirst();
        return new LabelerClaimResult(
                taskId,
                item.assignmentId(),
                item.submissionId(),
                item.assignmentStatus(),
                item.submissionStatus());
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:labeler:workbench" })
    public LabelerClaimBatchResult claimTaskBatch(Long taskId, Integer requestedCount) {
        return labelerClaimExecutor.executeClaim(currentUserContext.requireUserId(), taskId, requestedCount, false);
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public PageResponse<LabelerMyWorkRow> listMyWorks(ParsedListQuery query) {
        Long userId = currentUserContext.requireUserId();
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getLabelerId, userId)
                .in(AssignmentEntity::getStatus, AssignmentStatus.CLAIMED.name(), AssignmentStatus.SUBMITTED.name())
                .orderByDesc(AssignmentEntity::getUpdatedAt);
        for (ParsedFilter filter : query.filters()) {
            if ("taskId".equals(filter.field()) && filter.value() != null) {
                wrapper.eq(AssignmentEntity::getTaskId, Long.valueOf(String.valueOf(filter.value())));
            }
        }
        IPage<AssignmentEntity> pageResult = assignmentMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        List<LabelerMyWorkRow> rows = pageResult.getRecords().stream().map(this::toMyWorkRow).toList();
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(), rows);
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.ASSIGNMENT)
    public PageResponse<LabelerMyTaskRow> listMyTasks(ParsedListQuery query) {
        Long userId = currentUserContext.requireUserId();
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getLabelerId, userId);
        com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
        List<AssignmentEntity> mine = assignmentMapper.selectList(wrapper);
        if (mine == null || mine.isEmpty()) {
            return PageResponse.of(0L, query.page(), query.pageSize(), List.of());
        }

        Set<Long> assignmentIds = mine.stream().map(AssignmentEntity::getId).collect(Collectors.toSet());
        LambdaQueryWrapper<SubmissionEntity> subWrapper = new LambdaQueryWrapper<>();
        subWrapper.eq(SubmissionEntity::getDeletedFlag, 0)
                .eq(SubmissionEntity::getIsCurrent, SubmissionCurrentSupport.CURRENT_FLAG)
                .in(SubmissionEntity::getAssignmentId, assignmentIds);
        Map<Long, SubmissionEntity> submissionByAssignment = new HashMap<>();
        for (SubmissionEntity s : submissionMapper.selectList(subWrapper)) {
            submissionByAssignment.put(s.getAssignmentId(), s);
        }

        Map<Long, List<AssignmentEntity>> byTask = mine.stream()
                .collect(Collectors.groupingBy(AssignmentEntity::getTaskId, LinkedHashMap::new, Collectors.toList()));

        Map<Long, TaskEntity> taskMap = new HashMap<>();
        if (!byTask.isEmpty()) {
            for (TaskEntity t : taskMapper.selectBatchIds(byTask.keySet())) {
                taskMap.put(t.getId(), t);
            }
        }

        String keyword = query.keyword() == null ? null : query.keyword().trim();
        List<LabelerMyTaskRow> rows = new ArrayList<>(byTask.size());
        for (Map.Entry<Long, List<AssignmentEntity>> entry : byTask.entrySet()) {
            TaskEntity task = taskMap.get(entry.getKey());
            if (task == null || task.getDeletedFlag() == 1) {
                continue;
            }
            if (keyword != null && !keyword.isEmpty()) {
                String title = task.getTitle() == null ? "" : task.getTitle();
                String code = task.getTaskCode() == null ? "" : task.getTaskCode();
                if (!title.contains(keyword) && !code.contains(keyword)) {
                    continue;
                }
            }
            rows.add(buildMyTaskRow(task, entry.getValue(), submissionByAssignment));
        }
        rows.sort(Comparator.comparing(
                (LabelerMyTaskRow r) -> r.lastActivityAt() == null ? Instant.EPOCH : r.lastActivityAt())
                .reversed());

        int total = rows.size();
        int from = Math.max(0, (query.page() - 1) * query.pageSize());
        int to = Math.min(total, from + query.pageSize());
        List<LabelerMyTaskRow> pageRows = from >= total ? List.of() : rows.subList(from, to);
        return PageResponse.of((long) total, query.page(), query.pageSize(), pageRows);
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    @com.labelhub.core.datapermission.DataScope(resource = com.labelhub.core.datapermission.DataResourceType.ASSIGNMENT)
    public LabelerMyTaskDetail getMyTask(Long taskId) {
        LabelerMyTaskContext context = requireMyTaskContext(taskId);
        LabelerMyTaskRow row = buildMyTaskRow(
                context.task(),
                context.assignments(),
                context.submissionByAssignment());
        Long ownerId = context.task().getOwnerId();
        Map<Long, TaskItemEntity> itemById = loadTaskItems(context.assignments());
        return new LabelerMyTaskDetail(
                row.taskId(),
                row.taskCode(),
                row.taskName(),
                row.sceneCode(),
                row.descriptionText(),
                ownerId,
                ownerId == null ? null : userDisplayNameResolver.resolve(ownerId),
                row.totalCount(),
                row.openCount(),
                row.submittedCount(),
                row.submittedEverCount(),
                row.approvedCount(),
                row.rejectedCount(),
                row.needsRevisionCount(),
                row.nextAssignmentId(),
                row.lastClaimedAt(),
                row.lastActivityAt(),
                row.deadlineAt(),
                submissionTimelineAssembler.buildTaskRecordSubmitHistories(
                        context.assignments(),
                        context.submissionByAssignment(),
                        itemById));
    }

    private Map<Long, TaskItemEntity> loadTaskItems(List<AssignmentEntity> assignments) {
        Set<Long> itemIds = assignments.stream()
                .map(AssignmentEntity::getItemId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, TaskItemEntity> itemById = new HashMap<>();
        if (itemIds.isEmpty()) {
            return itemById;
        }
        for (TaskItemEntity item : taskItemMapper.selectBatchIds(itemIds)) {
            if (item != null && item.getDeletedFlag() == 0) {
                itemById.put(item.getId(), item);
            }
        }
        return itemById;
    }

    private LabelerMyTaskContext requireMyTaskContext(Long taskId) {
        if (taskId == null) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        Long userId = currentUserContext.requireUserId();
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getLabelerId, userId)
                .eq(AssignmentEntity::getTaskId, taskId);
        com.labelhub.infra.datapermission.DataScopeApplier.apply(wrapper);
        List<AssignmentEntity> assignments = assignmentMapper.selectList(wrapper);
        if (assignments == null || assignments.isEmpty()) {
            throw new BusinessException(ErrorCode.TASK_NO_PERMISSION);
        }
        Set<Long> assignmentIds = assignments.stream().map(AssignmentEntity::getId).collect(Collectors.toSet());
        LambdaQueryWrapper<SubmissionEntity> subWrapper = new LambdaQueryWrapper<>();
        subWrapper.eq(SubmissionEntity::getDeletedFlag, 0).in(SubmissionEntity::getAssignmentId, assignmentIds);
        List<SubmissionEntity> submissions = submissionMapper.selectList(subWrapper);
        return new LabelerMyTaskContext(
                task,
                assignments,
                submissions,
                indexCurrentSubmissions(submissions));
    }

    private record LabelerMyTaskContext(
            TaskEntity task,
            List<AssignmentEntity> assignments,
            List<SubmissionEntity> submissions,
            Map<Long, SubmissionEntity> submissionByAssignment) {
    }

    private LabelerMyTaskRow buildMyTaskRow(
            TaskEntity task,
            List<AssignmentEntity> assignments,
            Map<Long, SubmissionEntity> submissionByAssignment) {
        int total = assignments.size();
        int open = 0;
        int submitted = 0;
        int submittedEver = 0;
        int approved = 0;
        int rejected = 0;
        int needsRevision = 0;
        Long nextAssignmentId = null;
        Instant lastClaimedAt = null;
        Instant lastActivityAt = null;
        AssignmentEntity nextCandidate = null;
        for (AssignmentEntity a : assignments) {
            SubmissionEntity s = submissionByAssignment.get(a.getId());
            String submissionStatus = s == null ? null : s.getCurrentStatus();
            boolean claimed = AssignmentStatus.CLAIMED.name().equals(a.getStatus());
            boolean assignmentSubmitted = AssignmentStatus.SUBMITTED.name().equals(a.getStatus());
            boolean actionable = claimed || (assignmentSubmitted && isRevisionSubmission(submissionStatus));
            if (actionable) {
                open++;
                SubmissionEntity nextSubmission = nextCandidate == null
                        ? null
                        : submissionByAssignment.get(nextCandidate.getId());
                if (shouldPreferNextAssignment(a, s, nextCandidate, nextSubmission)) {
                    nextCandidate = a;
                }
            }
            if (a.getClaimedAt() != null
                    && (lastClaimedAt == null || a.getClaimedAt().isAfter(lastClaimedAt))) {
                lastClaimedAt = a.getClaimedAt();
            }
            if (a.getUpdatedAt() != null
                    && (lastActivityAt == null || a.getUpdatedAt().isAfter(lastActivityAt))) {
                lastActivityAt = a.getUpdatedAt();
            }
            if (s != null) {
                if ((s.getSubmitCount() != null && s.getSubmitCount() > 0)
                        || s.getLastSubmittedAt() != null) {
                    submittedEver++;
                }
                String st = s.getCurrentStatus();
                if (SubmissionStatus.SUBMITTED.name().equals(st)
                        || SubmissionStatus.AI_REVIEWING.name().equals(st)) {
                    submitted++;
                } else if (SubmissionStatus.APPROVED.name().equals(st)) {
                    approved++;
                } else if (SubmissionStatus.REJECTED.name().equals(st)) {
                    rejected++;
                } else if (SubmissionStatus.NEEDS_REVISION.name().equals(st)
                        || SubmissionStatus.AI_REJECTED.name().equals(st)) {
                    needsRevision++;
                }
            }
        }
        if (nextCandidate != null) {
            nextAssignmentId = nextCandidate.getId();
        }
        return new LabelerMyTaskRow(
                task.getId(),
                task.getTaskCode(),
                task.getTitle(),
                task.getSceneCode(),
                task.getDescriptionText(),
                total,
                open,
                submitted,
                submittedEver,
                approved,
                rejected,
                needsRevision,
                nextAssignmentId,
                lastClaimedAt,
                lastActivityAt,
                task.getDeadlineAt());
    }

    private static boolean isRevisionSubmission(String status) {
        return SubmissionStatus.NEEDS_REVISION.name().equals(status)
                || SubmissionStatus.AI_REJECTED.name().equals(status)
                || SubmissionStatus.isAppealApprovedForResubmit(status);
    }

    private static int nextAssignmentPriority(String submissionStatus) {
        if (SubmissionStatus.NEEDS_REVISION.name().equals(submissionStatus)
                || SubmissionStatus.AI_REJECTED.name().equals(submissionStatus)) {
            return 0;
        }
        if (SubmissionStatus.isAppealApprovedForResubmit(submissionStatus)) {
            return 1;
        }
        if (SubmissionStatus.DRAFT.name().equals(submissionStatus)) {
            return 2;
        }
        return 3;
    }

    private static boolean shouldPreferNextAssignment(
            AssignmentEntity candidate,
            SubmissionEntity candidateSubmission,
            AssignmentEntity current,
            SubmissionEntity currentSubmission) {
        if (current == null) {
            return true;
        }
        String candidateStatus = candidateSubmission == null ? null : candidateSubmission.getCurrentStatus();
        String currentStatus = currentSubmission == null ? null : currentSubmission.getCurrentStatus();
        int candidateRank = nextAssignmentPriority(candidateStatus);
        int currentRank = nextAssignmentPriority(currentStatus);
        if (candidateRank != currentRank) {
            return candidateRank < currentRank;
        }
        Instant candidateAt = candidate.getClaimedAt();
        Instant currentAt = current.getClaimedAt();
        if (candidateAt == null) {
            return false;
        }
        if (currentAt == null) {
            return true;
        }
        return candidateAt.isBefore(currentAt);
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public PageResponse<SubmissionSummary> listDraftSubmissions(ParsedListQuery query) {
        return listSubmissionsForLabeler(query, SubmissionStatus.DRAFT.name());
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public SubmissionDetail getDraftSubmission(Long submissionId) {
        SubmissionEntity entity = labelerSubmissionAccessSupport.requireOwnedSubmission(submissionId);
        String status = entity.getCurrentStatus();
        if (!SubmissionStatus.allowsLabelerDraftEdit(status)) {
            throw new BusinessException(ErrorCode.SUBMISSION_STATUS_INVALID);
        }
        return submissionSummaryAssembler.assembleDetail(
                entity, readMap(entity.getDraftDataJson()), readMap(entity.getExtJson()));
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public PageResponse<SubmissionSummary> listSubmittedHistory(ParsedListQuery query) {
        Long userId = currentUserContext.requireUserId();
        LambdaQueryWrapper<SubmissionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionEntity::getDeletedFlag, 0)
                .eq(SubmissionEntity::getLabelerId, userId)
                .gt(SubmissionEntity::getSubmitCount, 0)
                .orderByDesc(SubmissionEntity::getLastSubmittedAt);
        applySubmissionKeyword(wrapper, query);
        IPage<SubmissionEntity> pageResult = submissionMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        return PageResponse.of(
                pageResult.getTotal(),
                query.page(),
                query.pageSize(),
                submissionSummaryAssembler.assemble(pageResult.getRecords()));
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public SubmissionDetail getSubmissionHistory(Long submissionId) {
        SubmissionEntity entity = labelerSubmissionAccessSupport.requireOwnedSubmission(submissionId);
        if (entity.getSubmitCount() == null || entity.getSubmitCount() <= 0) {
            throw new BusinessException(ErrorCode.SUBMISSION_STATUS_INVALID);
        }
        return submissionSummaryAssembler.assembleDetail(
                entity, readMap(entity.getDraftDataJson()), readMap(entity.getExtJson()));
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public LabelerWorkDetail loadWork(Long assignmentId) {
        return buildWorkDetail(labelerSubmissionAccessSupport.requireOwnedAssignment(assignmentId));
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public LabelerTaskItemDetail getAssignmentTaskItem(Long assignmentId) {
        AssignmentEntity assignment = labelerSubmissionAccessSupport.requireOwnedAssignment(assignmentId);
        TaskItemEntity item = requireTaskItem(assignment.getItemId());
        SubmissionEntity submission = findSubmission(assignment.getId());
        String templateSchemaJson = resolveTemplateSchemaJson(
                submission == null ? null : submission.getCurrentTemplateVersionId());
        String rawJson = item.getPayloadJson();
        if (rawJson == null || rawJson.isBlank()) {
            rawJson = "{}";
        }
        Map<String, Object> itemPayload = readMap(rawJson);
        return new LabelerTaskItemDetail(
                item.getId(),
                item.getTaskId(),
                item.getSourceItemKey(),
                item.getSeqNo(),
                itemPayload,
                TaskPayloadPreviewSupport.toPayloadPreview(objectMapper, rawJson),
                templateSchemaJson,
                rawJson);
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public LabelerWorkSession loadWorkSessionForAssignment(Long assignmentId, ParsedListQuery query) {
        AssignmentEntity assignment = labelerSubmissionAccessSupport.requireOwnedAssignment(assignmentId);
        return loadWorkSession(assignment.getTaskId(), assignmentId, withTaskFilter(query, assignment.getTaskId()));
    }

    @Override
    @RequireAnyPermission({ "business:labeler:workbench" })
    public LabelerWorkSession loadWorkSession(Long taskId, Long assignmentId, ParsedListQuery query) {
        TaskEntity task = requireTask(taskId);
        if (assignmentId != null) {
            AssignmentEntity current = labelerSubmissionAccessSupport.requireOwnedAssignment(assignmentId);
            if (!taskId.equals(current.getTaskId())) {
                throw new BusinessException(ErrorCode.TASK_NO_PERMISSION);
            }
        }

        ParsedListQuery queueQuery = withTaskFilter(query, taskId);
        PageResponse<LabelerMyWorkRow> queue = listMyWorks(queueQuery);

        Map<Long, LabelerWorkDetail> works = new LinkedHashMap<>();
        for (LabelerMyWorkRow row : queue.list()) {
            AssignmentEntity assignment = labelerSubmissionAccessSupport.requireOwnedAssignment(row.assignmentId());
            works.put(row.assignmentId(), buildWorkDetail(assignment));
        }

        if (assignmentId != null && !works.containsKey(assignmentId)) {
            works.put(assignmentId, buildWorkDetail(labelerSubmissionAccessSupport.requireOwnedAssignment(assignmentId)));
        }

        TemplateVersionEntity version = null;
        if (task.getCurrentTemplateVersionId() != null) {
            version = templateVersionMapper.selectById(task.getCurrentTemplateVersionId());
        }

        LabelerWorkSessionTaskMeta taskMeta = new LabelerWorkSessionTaskMeta(
                task.getId(),
                task.getTitle(),
                task.getSceneCode(),
                task.getDescriptionText(),
                task.getMaxClaimPerUser(),
                version == null ? null : version.getId(),
                version == null ? null : version.getVersionNo());

        return new LabelerWorkSession(queue, works, taskMeta);
    }

    private ParsedListQuery withTaskFilter(ParsedListQuery query, Long taskId) {
        List<ParsedFilter> filters = new ArrayList<>(query.filters() == null ? List.of() : query.filters());
        boolean hasTaskFilter = filters.stream().anyMatch(filter -> "taskId".equals(filter.field()));
        if (!hasTaskFilter) {
            filters.add(new ParsedFilter("taskId", com.labelhub.core.lowcode.query.FilterOperator.EQ, taskId));
        }
        return new ParsedListQuery(query.page(), query.pageSize(), query.keyword(), filters, query.sort());
    }

    private LabelerWorkDetail buildWorkDetail(AssignmentEntity assignment) {
        SubmissionEntity submission = submissionCurrentSupport.ensureCurrentDraftForAssignment(
                assignment,
                SubmissionSupersedeReason.LABELER_CLAIMED.name());
        submission = submissionReturnForRevisionLifecycle.reconcileAiRejectedIfNeeded(submission);
        assignment = assignmentMapper.selectById(assignment.getId());
        TaskEntity task = requireTask(assignment.getTaskId());
        TaskItemEntity item = requireTaskItem(assignment.getItemId());
        TemplateVersionEntity version = requireTemplateVersion(submission.getCurrentTemplateVersionId());
        return new LabelerWorkDetail(
                toAssignmentSummary(assignment),
                submissionSummaryAssembler.assembleDetail(
                        submission,
                        readMap(submission.getDraftDataJson()),
                        readMap(submission.getExtJson())),
                new LabelerWorkTaskInfo(task.getId(), task.getTitle(), task.getSceneCode(), task.getDescriptionText()),
                new LabelerWorkItemInfo(item.getId(), item.getSeqNo(), readMap(item.getPayloadJson())),
                new LabelerWorkTemplateInfo(
                        version.getId(),
                        version.getVersionNo(),
                        FormSchemaRuntimeSanitizer.sanitizeForClient(objectMapper, version.getSchemaJson())),
                buildLastReviewInfo(submission));
    }

    private LabelerLastReviewInfo buildLastReviewInfo(SubmissionEntity submission) {
        ReviewRecordEntity lastReview = findLastReview(submission.getId());
        if (lastReview != null) {
            String comment = lastReview.getCommentText();
            if (comment != null && !comment.isBlank()) {
                return new LabelerLastReviewInfo(
                        comment.trim(),
                        lastReview.getDecidedAt(),
                        userDisplayNameResolver.resolve(lastReview.getReviewerId()));
            }
        }
        String fallback = submission.getLastReturnReasonText();
        if (fallback == null || fallback.isBlank()) {
            return null;
        }
        return new LabelerLastReviewInfo(
                fallback.trim(),
                submission.getLastActionAt(),
                null);
    }

    private ReviewRecordEntity findLastReview(Long submissionId) {
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0)
                .eq(ReviewRecordEntity::getSubmissionId, submissionId)
                .orderByDesc(ReviewRecordEntity::getDecidedAt)
                .last("LIMIT 1");
        return reviewRecordMapper.selectOne(wrapper);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:labeler:workbench" })
    public SubmissionSummary saveSubmissionDraft(Long submissionId, SubmissionDraftSaveCommand command) {
        SubmissionEntity entity = labelerSubmissionAccessSupport.requireOwnedSubmission(submissionId);
        if (!SubmissionStatus.allowsLabelerDraftEdit(entity.getCurrentStatus())) {
            throw new BusinessException(ErrorCode.SUBMISSION_STATUS_INVALID);
        }
        Map<String, Object> draftData = command.draftData();
        templateSubmissionDataValidator.sanitizeAnnotateSubmitData(entity.getCurrentTemplateVersionId(), draftData);
        entity.setDraftDataJson(writeJson(draftData));
        entity.setDraftSavedAt(Instant.now());
        entity.setLastActionCode(Boolean.TRUE.equals(command.autoSave()) ? "AUTO_SAVE_DRAFT" : "SAVE_DRAFT");
        entity.setLastActionAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        submissionMapper.updateById(entity);
        return submissionSummaryAssembler.assemble(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:labeler:workbench" })
    public SubmissionSummary submitSubmission(Long submissionId, SubmissionSubmitCommand command) {
        SubmissionEntity entity = labelerSubmissionAccessSupport.requireOwnedSubmission(submissionId);
        entity = submissionSubmitLifecycle.submit(entity, command.finalSubmitData());

        AssignmentEntity assignment = assignmentMapper.selectById(entity.getAssignmentId());
        if (assignment != null && assignment.getDeletedFlag() == 0) {
            if (AssignmentStatus.CLAIMED.name().equals(assignment.getStatus())) {
                AssignmentStatus assignmentNext = assignmentStateMachineService.transition(assignment.getId(),
                        AssignmentEvent.SUBMIT);
                assignment.setStatus(assignmentNext.name());
                assignment.setClosedAt(Instant.now());
                assignmentMapper.updateById(assignment);
            }
        }
        return submissionSummaryAssembler.assemble(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:labeler:workbench" })
    public SubmissionSummary withdrawSubmission(Long submissionId) {
        SubmissionEntity submission = labelerSubmissionAccessSupport.requireOwnedSubmission(submissionId);
        AssignmentEntity assignment = labelerSubmissionAccessSupport.requireOwnedAssignment(submission.getAssignmentId());
        SubmissionEntity refreshed = submissionWithdrawLifecycle.withdraw(submission, assignment);
        return submissionSummaryAssembler.assemble(refreshed);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:labeler:workbench" })
    public SubmissionAppealSummary submitAppeal(Long submissionId, SubmissionAppealCommand command) {
        SubmissionEntity submission = labelerSubmissionAccessSupport.requireOwnedSubmission(submissionId);
        return submissionAppealAssembler.assemble(
                submissionAppealLifecycle.submitAppeal(submission, command.reasonText(), null));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:labeler:workbench" })
    public SubmissionAppealBatchOperationSummary batchSubmitAppeals(SubmissionAppealBatchCommand command) {
        List<Long> submissionIds = command.ids().stream().distinct().toList();
        String batchKey = "appeal-submit:" + java.util.UUID.randomUUID();
        AppealBatchOperationEntity operation = new AppealBatchOperationEntity();
        operation.setBatchKey(batchKey);
        operation.setTaskId(resolveSingleTaskId(
                submissionIds.stream().map(labelerSubmissionAccessSupport::requireOwnedSubmission).toList()));
        operation.setOperatorId(currentUserContext.requireUserId());
        operation.setBatchAction("SUBMIT_APPEAL");
        operation.setTargetTotalCount(submissionIds.size());
        operation.setSuccessCount(0);
        operation.setFailedCount(0);
        operation.setStatus("RUNNING");
        operation.setStartedAt(Instant.now());
        operation.setCreatedAt(Instant.now());
        operation.setUpdatedAt(Instant.now());
        appealBatchOperationMapper.insert(operation);

        int success = 0;
        int failed = 0;
        for (Long submissionId : submissionIds) {
            try {
                submissionAppealLifecycle.submitAppeal(
                        labelerSubmissionAccessSupport.requireOwnedSubmission(submissionId), command.reasonText(), batchKey);
                success++;
            } catch (Exception ex) {
                failed++;
            }
        }
        operation.setSuccessCount(success);
        operation.setFailedCount(failed);
        operation.setStatus(failed == 0 ? "SUCCESS" : (success == 0 ? "FAILED" : "PARTIAL"));
        operation.setFinishedAt(Instant.now());
        operation.setUpdatedAt(Instant.now());
        appealBatchOperationMapper.updateById(operation);
        return submissionAppealAssembler.assembleBatch(
                appealBatchOperationMapper.selectById(operation.getId()));
    }

    private PageResponse<SubmissionSummary> listSubmissionsForLabeler(ParsedListQuery query, String status) {
        Long userId = currentUserContext.requireUserId();
        LambdaQueryWrapper<SubmissionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionEntity::getDeletedFlag, 0)
                .eq(SubmissionEntity::getLabelerId, userId)
                .eq(SubmissionEntity::getCurrentStatus, status);
        applySubmissionKeyword(wrapper, query);
        queryApplier.apply(wrapper, query, SubmissionQuerySpec.build());
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(SubmissionEntity::getUpdatedAt);
        }
        IPage<SubmissionEntity> pageResult = submissionMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        return PageResponse.of(
                pageResult.getTotal(),
                query.page(),
                query.pageSize(),
                submissionSummaryAssembler.assemble(pageResult.getRecords()));
    }

    private void applySubmissionKeyword(LambdaQueryWrapper<SubmissionEntity> wrapper, ParsedListQuery query) {
        if (query.keyword() == null || query.keyword().isBlank()) {
            return;
        }
        String keyword = query.keyword().trim();
        wrapper.and(w -> w.like(SubmissionEntity::getId, keyword).or().like(SubmissionEntity::getTaskId, keyword));
    }

    private TaskEntity requirePublishedTask(Long taskId) {
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!TASK_PUBLISHED.equals(task.getStatus())) {
            throw new BusinessException(ErrorCode.TASK_STATUS_INVALID, "Task is not available in market");
        }
        return task;
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

    private LabelerMarketTaskSummary toMarketSummary(TaskEntity task) {
        MarketAvailability availability = resolveMarketAvailability(task);
        return new LabelerMarketTaskSummary(
                task.getId(),
                task.getTaskCode(),
                task.getTitle(),
                task.getSceneCode(),
                task.getDescriptionText(),
                task.getStatus(),
                (int) availability.remainingItems(),
                (int) availability.claimedItems(),
                availability.templateReady(),
                availability.canClaim(),
                availability.blockReason(),
                task.getDeadlineAt(),
                task.getPublishedAt());
    }

    private MarketAvailability resolveMarketAvailability(TaskEntity task) {
        if (DistributeStrategy.ASSIGN.equals(task.getDistributeStrategy())) {
            long assigned = countAssignments(task.getId(), AssignmentStatus.CLAIMED.name())
                    + countAssignments(task.getId(), AssignmentStatus.SUBMITTED.name());
            boolean templateReady = isTemplateReady(task);
            return new MarketAvailability(0, assigned, templateReady, false, "LABELER_CLAIM_STRATEGY_FORBIDDEN");
        }
        long remaining = countAssignments(task.getId(), AssignmentStatus.UNCLAIMED.name());
        long claimed = countAssignments(task.getId(), AssignmentStatus.CLAIMED.name())
                + countAssignments(task.getId(), AssignmentStatus.SUBMITTED.name());
        if (remaining == 0 && claimed == 0) {
            LambdaQueryWrapper<TaskItemEntity> itemWrapper = new LambdaQueryWrapper<>();
            itemWrapper.eq(TaskItemEntity::getDeletedFlag, 0).eq(TaskItemEntity::getTaskId, task.getId());
            Long itemCount = taskItemMapper.selectCount(itemWrapper);
            remaining = itemCount == null ? 0 : itemCount;
        }
        boolean templateReady = isTemplateReady(task);
        boolean canClaim = templateReady && remaining > 0;
        String blockReason = null;
        if (!templateReady) {
            blockReason = "TASK_TEMPLATE_NOT_READY";
        } else if (remaining <= 0) {
            blockReason = "NO_AVAILABLE_ITEMS";
        }
        return new MarketAvailability(remaining, claimed, templateReady, canClaim, blockReason);
    }

    private boolean isTemplateReady(TaskEntity task) {
        if (task.getCurrentTemplateVersionId() == null) {
            return false;
        }
        TemplateVersionEntity current = templateVersionMapper.selectById(task.getCurrentTemplateVersionId());
        return current != null
                && current.getDeletedFlag() == 0
                && "PUBLISHED".equals(current.getStatus());
    }

    private record MarketAvailability(
            long remainingItems,
            long claimedItems,
            boolean templateReady,
            boolean canClaim,
            String blockReason) {
    }

    private long countAssignments(Long taskId, String status) {
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getTaskId, taskId)
                .eq(AssignmentEntity::getStatus, status);
        Long count = assignmentMapper.selectCount(wrapper);
        return count == null ? 0 : count;
    }

    private LabelerMyWorkRow toMyWorkRow(AssignmentEntity assignment) {
        TaskEntity task = taskMapper.selectById(assignment.getTaskId());
        SubmissionEntity submission = findSubmission(assignment.getId());
        TaskItemEntity taskItem = taskItemMapper.selectById(assignment.getItemId());
        return new LabelerMyWorkRow(
                assignment.getId(),
                submission == null ? null : submission.getId(),
                assignment.getTaskId(),
                task == null ? null : task.getTitle(),
                task == null ? null : task.getSceneCode(),
                assignment.getItemId(),
                taskItem == null ? null : taskItem.getSeqNo(),
                assignment.getStatus(),
                submission == null ? null : submission.getCurrentStatus(),
                assignment.getClaimedAt(),
                submission == null ? null : submission.getDraftSavedAt(),
                submission == null ? null : submission.getLastSubmittedAt(),
                assignment.getDeadlineAt());
    }

    private SubmissionEntity findSubmission(Long assignmentId) {
        return submissionCurrentSupport.findCurrentByAssignmentId(assignmentId).orElse(null);
    }

    private Map<Long, SubmissionEntity> indexCurrentSubmissions(List<SubmissionEntity> submissions) {
        Map<Long, SubmissionEntity> submissionByAssignment = new HashMap<>();
        for (SubmissionEntity submission : submissions) {
            if (Integer.valueOf(SubmissionCurrentSupport.CURRENT_FLAG).equals(submission.getIsCurrent())) {
                submissionByAssignment.put(submission.getAssignmentId(), submission);
            }
        }
        for (SubmissionEntity submission : submissions) {
            submissionByAssignment.putIfAbsent(submission.getAssignmentId(), submission);
        }
        return submissionByAssignment;
    }

    private AssignmentSummary toAssignmentSummary(AssignmentEntity entity) {
        return summaryAssembler.assemble(entity);
    }

    private String resolveTemplateSchemaJson(Long templateVersionId) {
        if (templateVersionId == null) {
            return null;
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(templateVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            return null;
        }
        return FormSchemaRuntimeSanitizer.sanitizeForClient(objectMapper, version.getSchemaJson());
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            log.warn("Failed to parse JSON from labeler workbench: {}", ex.getMessage());
            return Map.of();
        }
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception ex) {
            log.warn("Failed to write JSON for labeler workbench: {}", ex.getMessage());
            return "{}";
        }
    }

    private Long resolveSingleTaskId(List<SubmissionEntity> submissions) {
        Set<Long> taskIds = submissions.stream().map(SubmissionEntity::getTaskId).collect(Collectors.toSet());
        return taskIds.size() == 1 ? taskIds.iterator().next() : null;
    }
}
