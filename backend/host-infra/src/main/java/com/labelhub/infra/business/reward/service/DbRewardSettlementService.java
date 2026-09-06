package com.labelhub.infra.business.reward.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.RewardBatchSummary;
import com.labelhub.core.business.BusinessDtos.RewardDetailRow;
import com.labelhub.core.business.RewardSettlementService;
import com.labelhub.core.business.reward.RewardContext;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.business.reward.handler.RewardExportTaskHandler;
import com.labelhub.infra.business.reward.strategy.RewardStrategyRegistry;
import com.labelhub.infra.business.display.assembler.RewardDetailDisplayAssembler;
import com.labelhub.infra.business.display.assembler.RewardDetailDisplayAssembler.CalcBasisDisplayLabels;
import com.labelhub.infra.business.display.container.DisplayContainerBatchLoader;
import com.labelhub.infra.persistence.entity.FileAssetEntity;
import com.labelhub.infra.persistence.entity.RewardSettlementBatchEntity;
import com.labelhub.infra.persistence.entity.RewardSettlementDetailEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.FileAssetMapper;
import com.labelhub.infra.persistence.mapper.RewardSettlementBatchMapper;
import com.labelhub.infra.persistence.mapper.RewardSettlementDetailMapper;
import com.labelhub.infra.persistence.mapper.result.RewardBatchAggregateStats;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbRewardSettlementService implements RewardSettlementService {
    private static final Logger log = LoggerFactory.getLogger(DbRewardSettlementService.class);
    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_CONFIRMED = "CONFIRMED";
    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_REVERSED = "REVERSED";
    private static final String DEFAULT_CURRENCY = "CNY";
    private static final String DEFAULT_SETTLE_UNIT = "SUBMISSION";
    private static final String DEFAULT_CONDITION = "APPROVED";
    private static final int DELETED_FLAG_NOT_DELETED = 0;
    private static final int ASYNC_PRIORITY_EXPORT = 5;
    private static final String FILE_DOWNLOAD_PATH_PREFIX = "/api/v1/files/";

    private final RewardSettlementBatchMapper batchMapper;
    private final RewardSettlementDetailMapper detailMapper;
    private final SubmissionMapper submissionMapper;
    private final TaskMapper taskMapper;
    private final RewardStrategyRegistry strategyRegistry;
    private final AsyncTaskService asyncTaskService;
    private final CurrentUserContext currentUserContext;
    private final UserDisplayNameResolver userDisplayNameResolver;
    private final FileAssetMapper fileAssetMapper;
    private final ObjectMapper objectMapper;
    private final RewardDetailDisplayAssembler rewardDetailDisplayAssembler;

    public DbRewardSettlementService(RewardSettlementBatchMapper batchMapper,
            RewardSettlementDetailMapper detailMapper, SubmissionMapper submissionMapper, TaskMapper taskMapper,
            RewardStrategyRegistry strategyRegistry, AsyncTaskService asyncTaskService,
            CurrentUserContext currentUserContext, UserDisplayNameResolver userDisplayNameResolver,
            FileAssetMapper fileAssetMapper, ObjectMapper objectMapper,
            RewardDetailDisplayAssembler rewardDetailDisplayAssembler) {
        this.batchMapper = batchMapper;
        this.detailMapper = detailMapper;
        this.submissionMapper = submissionMapper;
        this.taskMapper = taskMapper;
        this.strategyRegistry = strategyRegistry;
        this.asyncTaskService = asyncTaskService;
        this.currentUserContext = currentUserContext;
        this.userDisplayNameResolver = userDisplayNameResolver;
        this.fileAssetMapper = fileAssetMapper;
        this.objectMapper = objectMapper;
        this.rewardDetailDisplayAssembler = rewardDetailDisplayAssembler;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public PageResponse<RewardBatchSummary> listBatches(Long taskId, ParsedListQuery query) {
        String statusFilter = filterValue(query, "status");
        String keyword = StringUtils.hasText(query.keyword()) ? query.keyword().trim() : null;

        LambdaQueryWrapper<RewardSettlementBatchEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RewardSettlementBatchEntity::getDeletedFlag, 0);
        if (taskId != null) {
            wrapper.eq(RewardSettlementBatchEntity::getTaskId, taskId);
        }
        if (StringUtils.hasText(statusFilter)) {
            wrapper.eq(RewardSettlementBatchEntity::getStatus, statusFilter);
        }
        if (StringUtils.hasText(keyword)) {
            Set<Long> matchedTaskIds = findTaskIdsByKeyword(keyword);
            wrapper.and(q -> q.like(RewardSettlementBatchEntity::getBatchNo, keyword)
                    .or().like(RewardSettlementBatchEntity::getRemark, keyword)
                    .or().like(RewardSettlementBatchEntity::getStatus, keyword)
                    .or(matched -> matched.in(!matchedTaskIds.isEmpty(), RewardSettlementBatchEntity::getTaskId,
                            matchedTaskIds)));
        }
        wrapper.orderByDesc(RewardSettlementBatchEntity::getCreatedAt);
        var pageResult = batchMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                enrichBatchSummaries(pageResult.getRecords()));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public RewardBatchSummary getBatch(Long batchId) {
        RewardSettlementBatchEntity batch = loadBatch(batchId);
        return enrichBatchSummary(batch);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public PageResponse<RewardDetailRow> listDetails(Long batchId, ParsedListQuery query) {
        LambdaQueryWrapper<RewardSettlementDetailEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RewardSettlementDetailEntity::getDeletedFlag, 0)
                .eq(RewardSettlementDetailEntity::getBatchId, batchId)
                .orderByAsc(RewardSettlementDetailEntity::getId);
        var pageResult = detailMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        RewardSettlementBatchEntity batch = loadBatch(batchId);
        TaskEntity task = loadTask(batch.getTaskId());
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(detail -> enrichDetailRow(detail, batch, task)).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public RewardDetailRow getDetail(Long batchId, Long detailId) {
        RewardSettlementDetailEntity detail = detailMapper.selectOne(new LambdaQueryWrapper<RewardSettlementDetailEntity>()
                .eq(RewardSettlementDetailEntity::getDeletedFlag, 0)
                .eq(RewardSettlementDetailEntity::getId, detailId)
                .eq(RewardSettlementDetailEntity::getBatchId, batchId)
                .last("LIMIT 1"));
        if (detail == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "奖励明细不存在");
        }
        RewardSettlementBatchEntity batch = loadBatch(batchId);
        TaskEntity task = loadTask(detail.getTaskId());
        return enrichDetailRow(detail, batch, task);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    @Audit(entityType = "REWARD_BATCH", actionCode = "reward.createBatch", entityId = "#result.id()", after = com.labelhub.core.audit.AuditSnapshotSource.RESULT)
    public RewardBatchSummary createBatch(Long taskId) {
        TaskEntity task = loadTask(taskId);
        RewardSettlementBatchEntity batch = findOpenDraftBatch(taskId);
        if (batch == null) {
            Map<String, Object> rewardRule = normalizeRewardRule(task.getRewardRuleJson());
            batch = createOpenDraftBatch(task, rewardRule);
        }

        Map<String, Object> rewardRule = parseBatchRewardRule(batch, task);
        List<SubmissionEntity> approvedSubmissions = loadApprovedSubmissions(taskId);
        appendApprovedSubmissionsToBatch(batch, task, rewardRule, approvedSubmissions);
        refreshBatchAggregates(batch.getId(), approvedSubmissions.size());
        markTaskSettlementStatus(taskId, STATUS_DRAFT);
        return enrichBatchSummary(loadBatch(batch.getId()));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    public void recordApprovedSubmission(Long submissionId) {
        SubmissionEntity submission = loadSubmission(submissionId);
        if (!"APPROVED".equals(submission.getCurrentStatus())) {
            return;
        }

        TaskEntity task = loadTask(submission.getTaskId());
        RewardSettlementBatchEntity batch = findOpenDraftBatch(task.getId());
        if (batch == null) {
            Map<String, Object> rewardRule = normalizeRewardRule(task.getRewardRuleJson());
            batch = createOpenDraftBatch(task, rewardRule);
        }
        Map<String, Object> rewardRule = parseBatchRewardRule(batch, task);

        Long versionId = submission.getCurrentVersionId();
        if (versionId == null) {
            return;
        }
        int approvedCount = loadApprovedSubmissions(task.getId()).size();
        if (detailExists(batch.getId(), versionId)) {
            refreshBatchAggregates(batch.getId(), approvedCount);
            return;
        }
        if (loadSettledVersionIds(task.getId()).contains(versionId)) {
            return;
        }

        RewardSettlementDetailEntity detail = buildDetail(batch, task, submission, rewardRule);
        insertDetailIdempotent(detail);
        refreshBatchAggregates(batch.getId(), approvedCount);
        markTaskSettlementStatus(task.getId(), STATUS_DRAFT);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    @Audit(entityType = "REWARD_BATCH", actionCode = "reward.confirm", entityId = "#batchId")
    public RewardBatchSummary confirmBatch(Long batchId) {
        RewardSettlementBatchEntity batch = loadBatch(batchId);
        if (!STATUS_DRAFT.equals(batch.getStatus())) {
            throw new BusinessException(ErrorCode.REWARD_BATCH_STATUS_INVALID, "仅 DRAFT 批次可确认");
        }
        Instant now = Instant.now();
        batch.setStatus(STATUS_CONFIRMED);
        batch.setConfirmedBy(currentUserContext.userIdOrZero());
        batch.setConfirmedAt(now);
        batch.setUpdatedAt(now);
        batchMapper.updateById(batch);
        updateAllDetailsStatus(batchId, STATUS_CONFIRMED, now, true, true, false);
        markTaskSettlementStatus(batch.getTaskId(), STATUS_CONFIRMED);
        return enrichBatchSummary(loadBatch(batchId));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    @Audit(entityType = "REWARD_BATCH", actionCode = "reward.paid", entityId = "#batchId")
    public RewardBatchSummary markPaid(Long batchId) {
        RewardSettlementBatchEntity batch = loadBatch(batchId);
        if (!STATUS_CONFIRMED.equals(batch.getStatus()) && !STATUS_PAID.equals(batch.getStatus())) {
            throw new BusinessException(ErrorCode.REWARD_BATCH_STATUS_INVALID, "仅 CONFIRMED 批次可标记已打款");
        }
        if (STATUS_PAID.equals(batch.getStatus())) {
            return enrichBatchSummary(batch);
        }
        Instant now = Instant.now();
        batch.setStatus(STATUS_PAID);
        batch.setPaidAt(now);
        batch.setUpdatedAt(now);
        batchMapper.updateById(batch);
        updateAllDetailsStatus(batchId, STATUS_PAID, now, true, false, false);
        markTaskSettlementStatus(batch.getTaskId(), STATUS_PAID);
        return enrichBatchSummary(loadBatch(batchId));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    @Audit(entityType = "REWARD_BATCH", actionCode = "reward.reverse", entityId = "#batchId")
    public RewardBatchSummary reverseBatch(Long batchId) {
        RewardSettlementBatchEntity batch = loadBatch(batchId);
        if (STATUS_REVERSED.equals(batch.getStatus())) {
            return enrichBatchSummary(batch);
        }
        if (!List.of(STATUS_DRAFT, STATUS_CONFIRMED, STATUS_PAID).contains(batch.getStatus())) {
            throw new BusinessException(ErrorCode.REWARD_BATCH_STATUS_INVALID, "当前批次状态不允许冲正");
        }
        Instant now = Instant.now();
        batch.setStatus(STATUS_REVERSED);
        batch.setReversedAt(now);
        batch.setUpdatedAt(now);
        batchMapper.updateById(batch);
        updateAllDetailsStatus(batchId, STATUS_REVERSED, now, false, false, true);
        markTaskSettlementStatus(batch.getTaskId(), STATUS_REVERSED);
        return enrichBatchSummary(loadBatch(batchId));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:reward:manage" })
    @Audit(entityType = "REWARD_BATCH", actionCode = "reward.export", entityId = "#batchId")
    public RewardBatchSummary exportBatch(Long batchId) {
        RewardSettlementBatchEntity batch = loadBatch(batchId);
        if (!STATUS_CONFIRMED.equals(batch.getStatus())) {
            throw new BusinessException(ErrorCode.REWARD_BATCH_STATUS_INVALID, "仅 CONFIRMED 批次可导出");
        }
        asyncTaskService.enqueue(RewardExportTaskHandler.TASK_TYPE, "REWARD_BATCH", batchId,
                "reward-export:" + batchId, ASYNC_PRIORITY_EXPORT, Map.of("batchId", batchId));
        return enrichBatchSummary(batch);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:labeler:workbench" })
    public PageResponse<RewardDetailRow> listMyRewards(ParsedListQuery query) {
        Long currentUserId = currentUserContext.requireUserId();
        String keyword = StringUtils.hasText(query.keyword()) ? query.keyword().trim() : null;
        Long taskId = longFilter(query, "taskId");
        String status = filterValue(query, "status");
        String batchStatus = filterValue(query, "batchStatus");

        LambdaQueryWrapper<RewardSettlementDetailEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RewardSettlementDetailEntity::getDeletedFlag, 0)
                .eq(RewardSettlementDetailEntity::getUserId, currentUserId);
        if (taskId != null) {
            wrapper.eq(RewardSettlementDetailEntity::getTaskId, taskId);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(RewardSettlementDetailEntity::getStatus, status);
        }
        Set<Long> matchedBatchIds = StringUtils.hasText(batchStatus) ? findBatchIdsByStatus(batchStatus) : Set.of();
        Set<Long> keywordTaskIds = StringUtils.hasText(keyword) ? findTaskIdsByKeyword(keyword) : Set.of();
        Set<Long> keywordBatchIds = StringUtils.hasText(keyword) ? findBatchIdsByKeyword(keyword) : Set.of();
        if (StringUtils.hasText(batchStatus)) {
            if (matchedBatchIds.isEmpty()) {
                return PageResponse.of(0, query.page(), query.pageSize(), List.of());
            }
            wrapper.in(RewardSettlementDetailEntity::getBatchId, matchedBatchIds);
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.and(q -> q.like(RewardSettlementDetailEntity::getRewardReason, keyword)
                    .or().like(RewardSettlementDetailEntity::getStatus, keyword)
                    .or(matched -> matched.in(!keywordTaskIds.isEmpty(), RewardSettlementDetailEntity::getTaskId,
                            keywordTaskIds))
                    .or(matched -> matched.in(!keywordBatchIds.isEmpty(), RewardSettlementDetailEntity::getBatchId,
                            keywordBatchIds)));
        }
        wrapper.orderByDesc(RewardSettlementDetailEntity::getCreatedAt);

        var pageResult = detailMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        List<RewardSettlementDetailEntity> details = pageResult.getRecords();
        Map<Long, RewardSettlementBatchEntity> batchMap = loadBatchMap(details.stream().map(RewardSettlementDetailEntity::getBatchId).collect(Collectors.toSet()));
        Map<Long, TaskEntity> taskMap = loadTaskMap(details.stream().map(RewardSettlementDetailEntity::getTaskId).collect(Collectors.toSet()));

        List<RewardDetailRow> rows = details.stream()
                .map(detail -> enrichDetailRow(detail, batchMap.get(detail.getBatchId()), taskMap.get(detail.getTaskId())))
                .toList();
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(), rows);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:labeler:workbench" })
    public RewardDetailRow getMyReward(Long rewardId) {
        Long currentUserId = currentUserContext.requireUserId();
        RewardSettlementDetailEntity detail = detailMapper.selectOne(new LambdaQueryWrapper<RewardSettlementDetailEntity>()
                .eq(RewardSettlementDetailEntity::getDeletedFlag, 0)
                .eq(RewardSettlementDetailEntity::getId, rewardId)
                .eq(RewardSettlementDetailEntity::getUserId, currentUserId)
                .last("LIMIT 1"));
        if (detail == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "奖励记录不存在");
        }
        RewardSettlementBatchEntity batch = loadBatch(detail.getBatchId());
        TaskEntity task = loadTask(detail.getTaskId());
        return enrichDetailRow(detail, batch, task);
    }

    private RewardSettlementBatchEntity createOpenDraftBatch(TaskEntity task, Map<String, Object> rewardRule) {
        RewardSettlementBatchEntity batch = new RewardSettlementBatchEntity();
        batch.setTaskId(task.getId());
        batch.setBatchNo("RB-" + task.getId() + "-" + System.currentTimeMillis());
        batch.setStatus(STATUS_DRAFT);
        batch.setSettleScope("APPROVED_ONLY");
        batch.setCurrencyCode(resolveCurrency(rewardRule));
        batch.setRewardRuleSnapshotJson(toJson(rewardRule));
        batch.setTargetTotalCount(0);
        batch.setEffectiveTotalCount(0);
        batch.setUserTotalCount(0);
        batch.setTotalAmount(BigDecimal.ZERO);
        batch.setCreatedAt(Instant.now());
        batch.setUpdatedAt(Instant.now());
        batchMapper.insert(batch);
        markTaskSettlementStatus(task.getId(), STATUS_DRAFT);
        return batch;
    }

    private void appendApprovedSubmissionsToBatch(RewardSettlementBatchEntity batch, TaskEntity task,
            Map<String, Object> rewardRule, List<SubmissionEntity> approvedSubmissions) {
        Set<Long> settledVersionIds = loadSettledVersionIds(task.getId());
        Set<Long> existingVersionIds = loadExistingVersionIds(batch.getId());
        for (SubmissionEntity submission : approvedSubmissions) {
            Long versionId = submission.getCurrentVersionId();
            if (versionId == null || settledVersionIds.contains(versionId) || existingVersionIds.contains(versionId)) {
                continue;
            }
            insertDetailIdempotent(buildDetail(batch, task, submission, rewardRule));
        }
    }

    private void insertDetailIdempotent(RewardSettlementDetailEntity detail) {
        try {
            detailMapper.insert(detail);
        } catch (DuplicateKeyException ignored) {
            // 并发写入同一 (batch_id, submission_version_id) 时视为幂等成功。
        }
    }

    private RewardSettlementDetailEntity buildDetail(RewardSettlementBatchEntity batch, TaskEntity task,
            SubmissionEntity submission, Map<String, Object> rewardRule) {
        Long versionId = submission.getCurrentVersionId();
        String mode = resolveRewardMode(rewardRule);
        var strategy = strategyRegistry.requireStrategy(mode);
        BigDecimal amount = strategy.calculate(new RewardContext(
                task.getId(), submission.getLabelerId(), submission.getId(), versionId, null, rewardRule));
        Instant now = Instant.now();

        RewardSettlementDetailEntity detail = new RewardSettlementDetailEntity();
        detail.setBatchId(batch.getId());
        detail.setTaskId(task.getId());
        detail.setUserId(submission.getLabelerId());
        detail.setSubmissionId(submission.getId());
        detail.setSubmissionVersionId(versionId);
        detail.setAssignmentId(submission.getAssignmentId());
        detail.setCurrencyCode(resolveCurrency(rewardRule));
        detail.setAmount(amount);
        detail.setStatus(STATUS_DRAFT.equals(batch.getStatus()) ? STATUS_PENDING : batch.getStatus());
        detail.setQualityScore(null);
        detail.setRewardReason(mode);
        detail.setCalcBasisJson(buildCalcBasisJson(task.getId(), submission, rewardRule, amount, mode));
        detail.setEffectiveAt(now);
        detail.setCreatedAt(now);
        detail.setUpdatedAt(now);
        return detail;
    }

    private void refreshBatchAggregates(Long batchId, int approvedSubmissionCount) {
        RewardSettlementBatchEntity batch = loadBatch(batchId);
        RewardBatchAggregateStats stats = detailMapper.aggregateBatchStats(resolveTenantId(batch.getTenantId()), batchId);
        long effectiveTotalCount = stats != null && stats.effectiveTotalCount() != null
                ? stats.effectiveTotalCount()
                : 0L;
        long userTotalCount = stats != null && stats.userTotalCount() != null
                ? stats.userTotalCount()
                : 0L;
        BigDecimal totalAmount = stats != null && stats.totalAmount() != null
                ? stats.totalAmount()
                : BigDecimal.ZERO;
        batch.setTargetTotalCount(approvedSubmissionCount);
        batch.setEffectiveTotalCount((int) effectiveTotalCount);
        batch.setUserTotalCount((int) userTotalCount);
        batch.setTotalAmount(totalAmount);
        batch.setUpdatedAt(Instant.now());
        batchMapper.updateById(batch);
    }

    private RewardBatchSummary enrichBatchSummary(RewardSettlementBatchEntity batch) {
        TaskEntity task = taskMapper.selectById(batch.getTaskId());
        return enrichBatchSummary(batch, task);
    }

    private List<RewardBatchSummary> enrichBatchSummaries(List<RewardSettlementBatchEntity> batches) {
        Map<Long, TaskEntity> taskMap = loadTaskMap(batches.stream().map(RewardSettlementBatchEntity::getTaskId)
                .collect(Collectors.toSet()));
        Map<Long, FileAssetEntity> fileMap = loadFileMap(batches.stream().map(RewardSettlementBatchEntity::getExportFileId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()));
        return batches.stream()
                .map(batch -> enrichBatchSummary(
                        batch,
                        taskMap.get(batch.getTaskId()),
                        batch.getExportFileId() == null ? null : fileMap.get(batch.getExportFileId())))
                .toList();
    }

    private Map<Long, FileAssetEntity> loadFileMap(Set<Long> fileIds) {
        if (fileIds == null || fileIds.isEmpty()) {
            return Map.of();
        }
        return DisplayContainerBatchLoader.loadSoftDeleted(fileAssetMapper, fileIds).stream()
                .collect(Collectors.toMap(FileAssetEntity::getId, file -> file, (a, b) -> a, LinkedHashMap::new));
    }

    private RewardBatchSummary enrichBatchSummary(RewardSettlementBatchEntity batch, TaskEntity task) {
        FileAssetEntity exportFile = batch.getExportFileId() == null
                ? null
                : fileAssetMapper.selectById(batch.getExportFileId());
        return enrichBatchSummary(batch, task, exportFile);
    }

    private RewardBatchSummary enrichBatchSummary(
            RewardSettlementBatchEntity batch,
            TaskEntity task,
            FileAssetEntity exportFile) {
        String taskTitle = task != null ? task.getTitle() : null;
        String confirmedByName = batch.getConfirmedBy() == null
                ? null
                : userDisplayNameResolver.resolve(batch.getConfirmedBy());
        String exportFileName = null;
        String exportFileDownloadUrl = null;
        if (exportFile != null && exportFile.getDeletedFlag() == 0) {
            exportFileName = exportFile.getOriginalName();
            exportFileDownloadUrl = FILE_DOWNLOAD_PATH_PREFIX + exportFile.getId() + "/download";
        }
        return new RewardBatchSummary(batch.getId(), batch.getTaskId(), taskTitle, batch.getBatchNo(), batch.getStatus(),
                batch.getSettleScope(), batch.getCurrencyCode(), batch.getRewardRuleSnapshotJson(),
                batch.getTargetTotalCount(), batch.getEffectiveTotalCount(), batch.getUserTotalCount(),
                batch.getTotalAmount(), batch.getConfirmedBy(), confirmedByName, batch.getConfirmedAt(), batch.getPaidAt(),
                batch.getReversedAt(), batch.getExportFileId(), exportFileName, exportFileDownloadUrl, batch.getRemark(),
                batch.getCreatedAt());
    }

    private RewardDetailRow enrichDetailRow(RewardSettlementDetailEntity detail, RewardSettlementBatchEntity batch,
            TaskEntity task) {
        String taskTitle = task != null ? task.getTitle() : null;
        String batchNo = batch != null ? batch.getBatchNo() : null;
        String batchStatus = batch != null ? batch.getStatus() : null;
        String rewardRuleSnapshotJson = batch != null ? batch.getRewardRuleSnapshotJson() : null;
        Instant batchConfirmedAt = batch != null ? batch.getConfirmedAt() : null;
        Instant batchPaidAt = batch != null ? batch.getPaidAt() : null;
        String labelerDisplayName = userDisplayNameResolver.resolve(detail.getUserId(), detail.getUserId() != null
                ? "User#" + detail.getUserId()
                : null);
        CalcBasisDisplayLabels calcBasisLabels = rewardDetailDisplayAssembler.assembleCalcBasisLabels(detail);
        String calcBasisTaskTitle = firstNonBlank(calcBasisLabels.taskTitle(), taskTitle);
        return new RewardDetailRow(detail.getId(), detail.getBatchId(), detail.getTaskId(), taskTitle, batchNo,
                batchStatus, detail.getUserId(), labelerDisplayName, detail.getSubmissionId(),
                detail.getSubmissionVersionId(), detail.getAssignmentId(), detail.getCurrencyCode(), detail.getAmount(),
                detail.getQualityScore(), detail.getStatus(), detail.getRewardReason(), rewardRuleSnapshotJson,
                detail.getCalcBasisJson(), calcBasisTaskTitle, calcBasisLabels.submissionLabel(),
                calcBasisLabels.submissionVersionLabel(), calcBasisLabels.assignmentLabel(), detail.getEffectiveAt(),
                detail.getSettledAt(), detail.getReversedAt(), batchConfirmedAt, batchPaidAt, detail.getCreatedAt());
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (StringUtils.hasText(primary)) {
            return primary.trim();
        }
        return StringUtils.hasText(fallback) ? fallback.trim() : null;
    }

    private List<SubmissionEntity> loadApprovedSubmissions(Long taskId) {
        return submissionMapper.selectList(new LambdaQueryWrapper<SubmissionEntity>()
                .eq(SubmissionEntity::getTaskId, taskId)
                .eq(SubmissionEntity::getDeletedFlag, DELETED_FLAG_NOT_DELETED)
                .eq(SubmissionEntity::getCurrentStatus, "APPROVED")
                .orderByAsc(SubmissionEntity::getId));
    }

    private Set<Long> loadSettledVersionIds(Long taskId) {
        TaskEntity task = loadTask(taskId);
        return detailMapper.findDistinctSettledVersionIds(resolveTenantId(task.getTenantId()), taskId).stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<Long> loadExistingVersionIds(Long batchId) {
        RewardSettlementBatchEntity batch = loadBatch(batchId);
        return detailMapper
                .findDistinctVersionIdsByBatchId(resolveTenantId(batch.getTenantId()), batchId)
                .stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Long resolveTenantId(Long tenantId) {
        return tenantId != null && tenantId > 0 ? tenantId : 1L;
    }

    private boolean detailExists(Long batchId, Long versionId) {
        return detailMapper.selectCount(new LambdaQueryWrapper<RewardSettlementDetailEntity>()
                .eq(RewardSettlementDetailEntity::getDeletedFlag, 0)
                .eq(RewardSettlementDetailEntity::getBatchId, batchId)
                .eq(RewardSettlementDetailEntity::getSubmissionVersionId, versionId)) > 0;
    }

    private RewardSettlementBatchEntity findOpenDraftBatch(Long taskId) {
        return batchMapper.selectOne(new LambdaQueryWrapper<RewardSettlementBatchEntity>()
                .eq(RewardSettlementBatchEntity::getDeletedFlag, 0)
                .eq(RewardSettlementBatchEntity::getTaskId, taskId)
                .eq(RewardSettlementBatchEntity::getStatus, STATUS_DRAFT)
                .orderByDesc(RewardSettlementBatchEntity::getCreatedAt)
                .last("LIMIT 1"));
    }

    private RewardSettlementBatchEntity loadBatch(Long batchId) {
        RewardSettlementBatchEntity batch = batchMapper.selectById(batchId);
        if (batch == null || batch.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.REWARD_BATCH_NOT_FOUND, "结算批次不存在");
        }
        return batch;
    }

    private TaskEntity loadTask(Long taskId) {
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        return task;
    }

    private SubmissionEntity loadSubmission(Long submissionId) {
        SubmissionEntity submission = submissionMapper.selectById(submissionId);
        if (submission == null || submission.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "提交记录不存在");
        }
        return submission;
    }

    private Map<Long, TaskEntity> loadTaskMap(Set<Long> taskIds) {
        if (taskIds.isEmpty()) {
            return Map.of();
        }
        List<TaskEntity> tasks = taskMapper.selectBatchIds(taskIds);
        Map<Long, TaskEntity> map = new HashMap<>();
        for (TaskEntity task : tasks) {
            if (task != null && task.getDeletedFlag() == 0) {
                map.put(task.getId(), task);
            }
        }
        return map;
    }

    private Map<Long, RewardSettlementBatchEntity> loadBatchMap(Set<Long> batchIds) {
        if (batchIds.isEmpty()) {
            return Map.of();
        }
        List<RewardSettlementBatchEntity> batches = batchMapper.selectBatchIds(batchIds);
        Map<Long, RewardSettlementBatchEntity> map = new HashMap<>();
        for (RewardSettlementBatchEntity batch : batches) {
            if (batch != null && batch.getDeletedFlag() == 0) {
                map.put(batch.getId(), batch);
            }
        }
        return map;
    }

    private void markTaskSettlementStatus(Long taskId, String status) {
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null) {
            log.warn("Skip updating task reward settlement status because task was not found. taskId={}, status={}",
                    taskId, status);
            return;
        }
        if (task.getDeletedFlag() != DELETED_FLAG_NOT_DELETED) {
            log.warn("Skip updating task reward settlement status because task is deleted. taskId={}, status={}",
                    taskId, status);
            return;
        }
        task.setRewardSettlementStatus(status);
        task.setUpdatedAt(Instant.now());
        taskMapper.updateById(task);
    }

    private Map<String, Object> normalizeRewardRule(String json) {
        Map<String, Object> fallback = new LinkedHashMap<>();
        fallback.put("currency", DEFAULT_CURRENCY);
        fallback.put("settle_unit", DEFAULT_SETTLE_UNIT);
        fallback.put("base_amount", BigDecimal.ZERO);
        fallback.put("rules", List.of(Map.of("condition", DEFAULT_CONDITION, "amount", BigDecimal.ZERO)));
        if (!StringUtils.hasText(json)) {
            return fallback;
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {});
            if (parsed == null || parsed.isEmpty()) {
                return fallback;
            }
            Map<String, Object> normalized = new LinkedHashMap<>(parsed);
            normalized.putIfAbsent("currency", DEFAULT_CURRENCY);
            normalized.putIfAbsent("settle_unit", DEFAULT_SETTLE_UNIT);
            normalized.putIfAbsent("base_amount", BigDecimal.ZERO);
            if (!normalized.containsKey("rules") || normalized.get("rules") == null) {
                normalized.put("rules", List.of(Map.of("condition", DEFAULT_CONDITION, "amount", BigDecimal.ZERO)));
            }
            return normalized;
        } catch (Exception ex) {
            log.warn("Failed to parse reward rule json, fallback to defaults. json={}", json, ex);
            return fallback;
        }
    }

    private Map<String, Object> parseBatchRewardRule(RewardSettlementBatchEntity batch, TaskEntity task) {
        if (StringUtils.hasText(batch.getRewardRuleSnapshotJson())) {
            return normalizeRewardRule(batch.getRewardRuleSnapshotJson());
        }
        Map<String, Object> rewardRule = normalizeRewardRule(task.getRewardRuleJson());
        batch.setRewardRuleSnapshotJson(toJson(rewardRule));
        batch.setCurrencyCode(resolveCurrency(rewardRule));
        batch.setUpdatedAt(Instant.now());
        batchMapper.updateById(batch);
        return rewardRule;
    }

    private String resolveRewardMode(Map<String, Object> rewardRule) {
        Object mode = rewardRule.get("mode");
        if (mode != null && StringUtils.hasText(mode.toString())) {
            return mode.toString();
        }
        throw new BusinessException(ErrorCode.REWARD_RULE_MODE_UNSUPPORTED, "奖励规则缺少 mode");
    }

    private String resolveCurrency(Map<String, Object> rewardRule) {
        Object currency = rewardRule.get("currency");
        return currency == null || !StringUtils.hasText(currency.toString())
                ? DEFAULT_CURRENCY
                : currency.toString();
    }

    private String buildCalcBasisJson(Long taskId, SubmissionEntity submission, Map<String, Object> rewardRule,
            BigDecimal amount, String mode) {
        Map<String, Object> basis = new LinkedHashMap<>();
        basis.put("taskId", taskId);
        basis.put("submissionId", submission.getId());
        basis.put("submissionVersionId", submission.getCurrentVersionId());
        basis.put("assignmentId", submission.getAssignmentId());
        basis.put("labelerId", submission.getLabelerId());
        basis.put("finalStatus", "APPROVED");
        basis.put("mode", mode);
        basis.put("currency", resolveCurrency(rewardRule));
        basis.put("settleUnit", rewardRule.getOrDefault("settle_unit", DEFAULT_SETTLE_UNIT));
        basis.put("baseAmount", rewardRule.get("base_amount"));
        basis.put("amount", amount);
        basis.put("rule", rewardRule);
        return toJson(basis);
    }

    private String filterValue(ParsedListQuery query, String field) {
        if (query.filters() == null || query.filters().isEmpty()) {
            return null;
        }
        return query.filters().stream()
                .filter(filter -> field.equals(filter.field()))
                .map(ParsedFilter::value)
                .map(value -> value == null ? null : value.toString())
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null);
    }

    private Long longFilter(ParsedListQuery query, String field) {
        String value = filterValue(query, field);
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
    private Set<Long> findTaskIdsByKeyword(String keyword) {
        return taskMapper.selectList(new LambdaQueryWrapper<TaskEntity>()
                        .eq(TaskEntity::getDeletedFlag, 0)
                        .like(TaskEntity::getTitle, keyword))
                .stream()
                .map(TaskEntity::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<Long> findBatchIdsByStatus(String status) {
        return batchMapper.selectList(new LambdaQueryWrapper<RewardSettlementBatchEntity>()
                        .eq(RewardSettlementBatchEntity::getDeletedFlag, 0)
                        .eq(RewardSettlementBatchEntity::getStatus, status))
                .stream()
                .map(RewardSettlementBatchEntity::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<Long> findBatchIdsByKeyword(String keyword) {
        return batchMapper.selectList(new LambdaQueryWrapper<RewardSettlementBatchEntity>()
                        .eq(RewardSettlementBatchEntity::getDeletedFlag, 0)
                        .and(q -> q.like(RewardSettlementBatchEntity::getBatchNo, keyword)
                                .or().like(RewardSettlementBatchEntity::getStatus, keyword)))
                .stream()
                .map(RewardSettlementBatchEntity::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            log.warn("Failed to serialize reward value to json, fallback to empty object. value={}", value, ex);
            return "{}";
        }
    }

    private void updateAllDetailsStatus(Long batchId, String targetStatus, Instant now,
            boolean keepReversedUnchanged, boolean setSettledAt, boolean setReversedAt) {
        detailMapper.updateStatusByBatchId(batchId, targetStatus, now, keepReversedUnchanged, setSettledAt, setReversedAt);
    }
}
