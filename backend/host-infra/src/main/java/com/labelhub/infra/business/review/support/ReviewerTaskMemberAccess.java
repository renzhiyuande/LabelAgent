package com.labelhub.infra.business.review.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.datapermission.DataPermissionService;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScopePolicy;
import com.labelhub.core.datapermission.DataScopeType;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskMemberEntity;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TaskMemberMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Enforces task-scoped reviewer access aligned with REVIEW {@link DataScopeType#TASK_MEMBER}
 * data-scope policies (and related owner / all scopes).
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ReviewerTaskMemberAccess {

    static final String REVIEWER_WORKBENCH_PERMISSION = "business:reviewer:workbench";

    private final DataPermissionService dataPermissionService;
    private final TaskMemberMapper taskMemberMapper;
    private final TaskMapper taskMapper;
    private final ReviewRecordMapper reviewRecordMapper;

    public ReviewerTaskMemberAccess(
            DataPermissionService dataPermissionService,
            TaskMemberMapper taskMemberMapper,
            TaskMapper taskMapper,
            ReviewRecordMapper reviewRecordMapper) {
        this.dataPermissionService = dataPermissionService;
        this.taskMemberMapper = taskMemberMapper;
        this.taskMapper = taskMapper;
        this.reviewRecordMapper = reviewRecordMapper;
    }

    public void requireTaskAccess(Long taskId, Long userId, Set<String> roleCodes, Set<String> permissions) {
        if (taskId == null || taskId <= 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "taskId is required");
        }
        if (permissions != null && permissions.contains("system:admin")) {
            return;
        }
        List<DataScopePolicy> policies = dataPermissionService.listPolicies(roleCodes, DataResourceType.REVIEW);
        if (policies.isEmpty()) {
            if (usesDefaultTaskMemberScope(permissions)) {
                requireActiveReviewerMember(userId, taskId);
                return;
            }
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN, "No review data scope configured");
        }
        for (DataScopePolicy policy : policies) {
            if (matchesTask(policy, taskId, userId)) {
                return;
            }
        }
        throw new BusinessException(ErrorCode.AUTH_FORBIDDEN, "No access to this task review pool");
    }

    /**
     * Task ids the user may access for review-scoped aggregates. Empty list means unrestricted (caller skips filter).
     */
    public List<Long> listAccessibleTaskIds(Long userId, Set<String> roleCodes, Set<String> permissions) {
        if (permissions != null && permissions.contains("system:admin")) {
            return List.of();
        }
        List<DataScopePolicy> policies = dataPermissionService.listPolicies(roleCodes, DataResourceType.REVIEW);
        if (policies.isEmpty()) {
            if (usesDefaultTaskMemberScope(permissions)) {
                return listActiveReviewerMemberTaskIds(userId);
            }
            return List.of();
        }
        if (policies.stream().anyMatch(policy -> policy.scopeType() == DataScopeType.ALL)) {
            return List.of();
        }
        Set<Long> taskIds = new LinkedHashSet<>();
        for (DataScopePolicy policy : policies) {
            switch (policy.scopeType()) {
                case TASK_MEMBER -> taskIds.addAll(listActiveReviewerMemberTaskIds(userId));
                case TASK_OWNER, CREATED_BY_ME -> taskIds.addAll(listOwnedTaskIds(userId));
                case REVIEWER, ASSIGNED_TO_ME -> taskIds.addAll(listReviewedTaskIds(userId));
                default -> {
                }
            }
        }
        return new ArrayList<>(taskIds);
    }

    public boolean hasUnrestrictedReviewScope(Set<String> roleCodes, Set<String> permissions) {
        if (permissions != null && permissions.contains("system:admin")) {
            return true;
        }
        return dataPermissionService.listPolicies(roleCodes, DataResourceType.REVIEW).stream()
                .anyMatch(policy -> policy.scopeType() == DataScopeType.ALL);
    }

    public boolean isActiveReviewerMember(Long userId, Long taskId) {
        if (userId == null || taskId == null || taskId <= 0) {
            return false;
        }
        LambdaQueryWrapper<TaskMemberEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskMemberEntity::getDeletedFlag, 0)
                .eq(TaskMemberEntity::getStatus, "ACTIVE")
                .eq(TaskMemberEntity::getMemberRole, "REVIEWER")
                .eq(TaskMemberEntity::getTaskId, taskId)
                .eq(TaskMemberEntity::getUserId, userId)
                .last("LIMIT 1");
        return taskMemberMapper.selectOne(wrapper) != null;
    }

    private boolean usesDefaultTaskMemberScope(Set<String> permissions) {
        return permissions != null && permissions.contains(REVIEWER_WORKBENCH_PERMISSION);
    }

    private void requireActiveReviewerMember(Long userId, Long taskId) {
        if (!isActiveReviewerMember(userId, taskId)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN, "No access to this task review pool");
        }
    }

    private boolean matchesTask(DataScopePolicy policy, Long taskId, Long userId) {
        return switch (policy.scopeType()) {
            case ALL -> true;
            case TASK_OWNER, CREATED_BY_ME -> isTaskOwner(taskId, userId);
            case TASK_MEMBER -> isActiveReviewerMember(userId, taskId);
            case REVIEWER, ASSIGNED_TO_ME -> hasReviewedTask(userId, taskId);
            default -> false;
        };
    }

    private boolean isTaskOwner(Long taskId, Long userId) {
        TaskEntity task = taskMapper.selectById(taskId);
        return task != null
                && task.getDeletedFlag() != null
                && task.getDeletedFlag() == 0
                && userId.equals(task.getOwnerId());
    }

    private boolean hasReviewedTask(Long userId, Long taskId) {
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0)
                .eq(ReviewRecordEntity::getReviewerId, userId)
                .eq(ReviewRecordEntity::getTaskId, taskId)
                .last("LIMIT 1");
        return reviewRecordMapper.selectOne(wrapper) != null;
    }

    private List<Long> listActiveReviewerMemberTaskIds(Long userId) {
        LambdaQueryWrapper<TaskMemberEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskMemberEntity::getDeletedFlag, 0)
                .eq(TaskMemberEntity::getStatus, "ACTIVE")
                .eq(TaskMemberEntity::getMemberRole, "REVIEWER")
                .eq(TaskMemberEntity::getUserId, userId)
                .select(TaskMemberEntity::getTaskId);
        return taskMemberMapper.selectList(wrapper).stream()
                .map(TaskMemberEntity::getTaskId)
                .distinct()
                .toList();
    }

    private List<Long> listOwnedTaskIds(Long userId) {
        LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskEntity::getDeletedFlag, 0)
                .eq(TaskEntity::getOwnerId, userId)
                .select(TaskEntity::getId);
        return taskMapper.selectList(wrapper).stream().map(TaskEntity::getId).toList();
    }

    private List<Long> listReviewedTaskIds(Long userId) {
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0)
                .eq(ReviewRecordEntity::getReviewerId, userId)
                .select(ReviewRecordEntity::getTaskId);
        return reviewRecordMapper.selectList(wrapper).stream()
                .map(ReviewRecordEntity::getTaskId)
                .distinct()
                .toList();
    }
}
