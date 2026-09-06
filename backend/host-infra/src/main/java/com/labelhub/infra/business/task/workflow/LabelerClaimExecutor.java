package com.labelhub.infra.business.task.workflow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.business.BusinessDtos.LabelerClaimBatchItem;
import com.labelhub.core.business.BusinessDtos.LabelerClaimBatchResult;
import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.core.business.SubmissionService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.assignment.support.TaskClaimLockSupport;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.statemachine.AssignmentStatus;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 标注员抢单执行器
 * 
 * <p>
 * 负责任务项的抢单逻辑，支持并发安全的抢单操作。
 * 供工作台直连与 claim-token 兑换适配器调用，不依赖凭证模块。
 * 
 * <p>
 * 核心流程：
 * <ol>
 * <li>验证任务状态（必须已发布）</li>
 * <li>验证模板就绪状态</li>
 * <li>计算可领取数量（受maxClaimPerUser限制）</li>
 * <li>加锁执行抢单操作</li>
 * <li>批量更新分配状态为已领取</li>
 * <li>创建对应的提交草稿</li>
 * </ol>
 */
@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LabelerClaimExecutor {
    private static final String TASK_PUBLISHED = "PUBLISHED";
    private static final int MAX_SINGLE_CLAIM_BATCH = 50;

    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;
    private final AssignmentMapper assignmentMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final SubmissionService submissionService;
    private final TaskClaimLockSupport taskClaimLockSupport;
    private final com.labelhub.infra.business.distribute.DistributeStrategyRegistry distributeStrategyRegistry;

    public LabelerClaimExecutor(
            TaskMapper taskMapper,
            TaskItemMapper taskItemMapper,
            AssignmentMapper assignmentMapper,
            TemplateVersionMapper templateVersionMapper,
            SubmissionService submissionService,
            TaskClaimLockSupport taskClaimLockSupport,
            com.labelhub.infra.business.distribute.DistributeStrategyRegistry distributeStrategyRegistry) {
        this.taskMapper = taskMapper;
        this.taskItemMapper = taskItemMapper;
        this.assignmentMapper = assignmentMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.submissionService = submissionService;
        this.taskClaimLockSupport = taskClaimLockSupport;
        this.distributeStrategyRegistry = distributeStrategyRegistry;
    }

    /**
     * 执行抢单操作
     * 
     * <p>
     * 支持批量抢单，自动处理并发冲突。
     * 
     * @param labelerId      标注员ID
     * @param taskId         任务ID
     * @param requestedCount 请求领取数量（为空时使用任务默认值）
     * @return 抢单结果，包含成功领取的任务项列表
     * @throws BusinessException 当任务不存在、未发布、模板未就绪或领取数量超限等情况时抛出
     */
    @Transactional(timeout = 3)
    public LabelerClaimBatchResult executeClaim(Long labelerId, Long taskId, Integer requestedCount,
            boolean viaClaimToken) {
        // Step1: 验证任务状态
        TaskEntity task = requirePublishedTask(taskId);

        // Step1.5: 分发策略门禁（ASSIGN 拒广场领、QUOTA 直连需凭证等）
        distributeStrategyRegistry.requireStrategy(task.getDistributeStrategy())
                .checkClaimable(new com.labelhub.core.business.distribute.DistributeClaimContext(taskId, viaClaimToken));

        // Step2: 验证模板就绪
        if (!isTemplateReady(task)) {
            throw new BusinessException(ErrorCode.TASK_TEMPLATE_NOT_READY);
        }

        // Step3: 计算可领取数量
        int desired = (requestedCount == null || requestedCount <= 0) ? defaultClaimSize(task) : requestedCount;
        desired = Math.min(desired, MAX_SINGLE_CLAIM_BATCH);
        if (desired <= 0) {
            throw new BusinessException(ErrorCode.LABELER_CLAIM_COUNT_INVALID);
        }
        int max = task.getMaxClaimPerUser() == null ? 0 : task.getMaxClaimPerUser();
        int alreadyOpen = (int) countOpenAssignmentsForLabeler(taskId, labelerId);
        int allowedByQuota;
        if (max <= 0) {
            allowedByQuota = desired;
        } else {
            int remaining = max - alreadyOpen;
            if (remaining <= 0) {
                throw new BusinessException(ErrorCode.LABELER_CLAIM_LIMIT_REACHED);
            }
            allowedByQuota = Math.min(desired, remaining);
        }

        // Step4: 加锁执行抢单（防止并发冲突）
        final int quota = allowedByQuota;
        List<AssignmentEntity> picked = taskClaimLockSupport.executeWithTaskLock(taskId, () -> {
            List<AssignmentEntity> selected = pickUnclaimedAssignments(taskId, quota);
            int needMore = quota - selected.size();
            if (needMore > 0) {
                // 发布时已 PRESEED 时通常走不到；兼容历史任务或关闭预生成配置
                selected.addAll(createAssignmentsForNextItems(taskId, needMore));
            }
            if (selected.isEmpty()) {
                throw new BusinessException(ErrorCode.LABELER_CLAIM_NO_AVAILABLE_ITEMS);
            }
            Instant claimTime = Instant.now();
            List<Long> ids = selected.stream().map(AssignmentEntity::getId).toList();
            // 乐观锁更新：仅更新状态为UNCLAIMED的记录
            int updated = assignmentMapper.update(null,
                    new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<AssignmentEntity>()
                            .in(AssignmentEntity::getId, ids)
                            .eq(AssignmentEntity::getStatus, AssignmentStatus.UNCLAIMED.name())
                            .set(AssignmentEntity::getStatus, AssignmentStatus.CLAIMED.name())
                            .set(AssignmentEntity::getLabelerId, labelerId)
                            .set(AssignmentEntity::getClaimedAt, claimTime)
                            .set(AssignmentEntity::getClaimSource, "MARKET")
                            .set(AssignmentEntity::getUpdatedAt, claimTime));
            // 检查是否有并发冲突
            if (updated != selected.size()) {
                throw new BusinessException(ErrorCode.LABELER_CLAIM_NO_AVAILABLE_ITEMS,
                        "部分题目已被其他标注员领取，请重试");
            }
            // 更新内存中的实体状态
            for (AssignmentEntity entity : selected) {
                entity.setStatus(AssignmentStatus.CLAIMED.name());
                entity.setLabelerId(labelerId);
                entity.setClaimedAt(claimTime);
                entity.setClaimSource("MARKET");
                entity.setUpdatedAt(claimTime);
            }
            return selected;
        });

        // Step5: 为每个领取的分配创建提交草稿
        List<SubmissionSummary> submissions = new ArrayList<>(picked.size());
        for (AssignmentEntity assignment : picked) {
            submissions.add(submissionService.createDraft(assignment.getId()));
        }

        // Step6: 构建返回结果
        List<LabelerClaimBatchItem> items = new ArrayList<>(picked.size());
        for (int i = 0; i < picked.size(); i++) {
            AssignmentEntity a = picked.get(i);
            SubmissionSummary s = submissions.get(i);
            TaskItemEntity item = taskItemMapper.selectById(a.getItemId());
            items.add(new LabelerClaimBatchItem(
                    a.getId(),
                    s.id(),
                    a.getItemId(),
                    item == null ? null : item.getSeqNo(),
                    a.getStatus(),
                    s.status()));
        }

        // 判断是否部分领取
        boolean partial = picked.size() < desired;
        String partialReason = null;
        if (partial) {
            if (max > 0 && alreadyOpen + picked.size() >= max) {
                partialReason = "MAX_CLAIM_PER_USER";
            } else {
                partialReason = "NO_MORE_ITEMS";
            }
        }
        return new LabelerClaimBatchResult(
                taskId,
                desired,
                picked.size(),
                alreadyOpen,
                max,
                partial,
                partialReason,
                items.getFirst().assignmentId(),
                items.getFirst().submissionId(),
                items);
    }

    /**
     * 获取已发布的任务
     * 
     * @param taskId 任务ID
     * @return 任务实体
     * @throws BusinessException 当任务不存在、已删除或未发布时抛出
     */
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

    /**
     * 检查任务模板是否就绪
     * 
     * @param task 任务实体
     * @return true表示模板已就绪
     */
    private boolean isTemplateReady(TaskEntity task) {
        if (task.getCurrentTemplateVersionId() == null) {
            return false;
        }
        TemplateVersionEntity current = templateVersionMapper.selectById(task.getCurrentTemplateVersionId());
        return current != null
                && current.getDeletedFlag() == 0
                && "PUBLISHED".equals(current.getStatus());
    }

    /**
     * 获取默认领取数量
     * 
     * <p>
     * 优先使用任务配置的maxClaimPerUser，否则默认领取1个。
     * 
     * @param task 任务实体
     * @return 默认领取数量
     */
    private int defaultClaimSize(TaskEntity task) {
        Integer cap = task.getMaxClaimPerUser();
        if (cap != null && cap > 0) {
            return cap;
        }
        return 1;
    }

    /**
     * 统计标注员当前正在进行的分配数量
     * 
     * @param taskId    任务ID
     * @param labelerId 标注员ID
     * @return 进行中的分配数量
     */
    private long countOpenAssignmentsForLabeler(Long taskId, Long labelerId) {
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getTaskId, taskId)
                .eq(AssignmentEntity::getLabelerId, labelerId)
                .eq(AssignmentEntity::getStatus, AssignmentStatus.CLAIMED.name());
        Long count = assignmentMapper.selectCount(wrapper);
        return count == null ? 0L : count;
    }

    /**
     * 选取未领取的任务分配
     * 
     * @param taskId 任务ID
     * @param limit  选取数量限制
     * @return 未领取的分配列表
     */
    private List<AssignmentEntity> pickUnclaimedAssignments(Long taskId, int limit) {
        if (limit <= 0) {
            return new ArrayList<>();
        }
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getTaskId, taskId)
                .eq(AssignmentEntity::getStatus, AssignmentStatus.UNCLAIMED.name())
                .orderByAsc(AssignmentEntity::getId)
                .last("LIMIT " + limit);
        List<AssignmentEntity> list = assignmentMapper.selectList(wrapper);
        return list == null ? new ArrayList<>() : new ArrayList<>(list);
    }

    /**
     * 为尚未分配的任务项创建分配记录
     * 
     * <p>
     * 当预生成的分配用完时，动态创建新的分配记录。
     * 
     * @param taskId 任务ID
     * @param limit  创建数量限制
     * @return 新创建的分配列表
     */
    private List<AssignmentEntity> createAssignmentsForNextItems(Long taskId, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        // 获取所有任务项
        LambdaQueryWrapper<TaskItemEntity> itemWrapper = new LambdaQueryWrapper<>();
        itemWrapper.eq(TaskItemEntity::getDeletedFlag, 0)
                .eq(TaskItemEntity::getTaskId, taskId)
                .orderByAsc(TaskItemEntity::getSeqNo);
        List<TaskItemEntity> items = taskItemMapper.selectList(itemWrapper);
        if (items == null || items.isEmpty()) {
            return List.of();
        }

        // 获取已有分配的任务项ID
        List<Long> itemIds = items.stream().map(TaskItemEntity::getId).toList();
        LambdaQueryWrapper<AssignmentEntity> existsWrapper = new LambdaQueryWrapper<>();
        existsWrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .in(AssignmentEntity::getItemId, itemIds)
                .eq(AssignmentEntity::getSlotNo, 1);
        Set<Long> occupiedItemIds = assignmentMapper.selectList(existsWrapper).stream()
                .map(AssignmentEntity::getItemId)
                .collect(Collectors.toSet());

        // 创建新分配
        Instant now = Instant.now();
        List<AssignmentEntity> created = new ArrayList<>(limit);
        for (TaskItemEntity item : items) {
            if (created.size() >= limit) {
                break;
            }
            if (occupiedItemIds.contains(item.getId())) {
                continue;
            }
            AssignmentEntity entity = new AssignmentEntity();
            entity.setTaskId(taskId);
            entity.setItemId(item.getId());
            entity.setSlotNo(1);
            entity.setAssignType("AUTO_CLAIM");
            entity.setClaimSource("MARKET");
            entity.setStatus(AssignmentStatus.UNCLAIMED.name());
            entity.setCurrentRoundNo(1);
            entity.setAssignedAt(now);
            assignmentMapper.insert(entity);
            created.add(entity);
        }
        return created;
    }
}
