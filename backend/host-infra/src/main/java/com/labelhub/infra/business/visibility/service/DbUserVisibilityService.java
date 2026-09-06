package com.labelhub.infra.business.visibility.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.business.BusinessDtos.CollaboratorProfile;
import com.labelhub.core.business.CollaboratorRole;
import com.labelhub.core.business.UserVisibilityService;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.domain.model.Status;
import com.labelhub.domain.model.UserRole;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskMemberEntity;
import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.entity.UserRoleEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TaskMemberMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.persistence.mapper.UserRoleMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbUserVisibilityService implements UserVisibilityService {
    private static final int DEFAULT_LIMIT = 100;

    private final UserMapper userMapper;
    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;
    private final AssignmentMapper assignmentMapper;
    private final ReviewRecordMapper reviewRecordMapper;
    private final TaskMapper taskMapper;
    private final TaskMemberMapper taskMemberMapper;

    public DbUserVisibilityService(
            UserMapper userMapper,
            UserRoleMapper userRoleMapper,
            RoleMapper roleMapper,
            AssignmentMapper assignmentMapper,
            ReviewRecordMapper reviewRecordMapper,
            TaskMapper taskMapper,
            TaskMemberMapper taskMemberMapper) {
        this.userMapper = userMapper;
        this.userRoleMapper = userRoleMapper;
        this.roleMapper = roleMapper;
        this.assignmentMapper = assignmentMapper;
        this.reviewRecordMapper = reviewRecordMapper;
        this.taskMapper = taskMapper;
        this.taskMemberMapper = taskMemberMapper;
    }

    @Override
    public List<OptionItem> listVisibleCollaborators(
            Long viewerId,
            Set<String> viewerRoles,
            CollaboratorRole targetRole,
            String keyword,
            int limit) {
        if (viewerId == null) {
            return List.of();
        }
        int normalizedLimit = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, DEFAULT_LIMIT);
        Set<Long> visibleIds = resolveVisibleUserIds(viewerId, viewerRoles);
        if (visibleIds.isEmpty()) {
            return List.of();
        }
        if (targetRole != null) {
            visibleIds = applyTargetRoleFilter(visibleIds, targetRole);
        }
        if (visibleIds.isEmpty()) {
            return List.of();
        }
        return loadActiveUserOptions(visibleIds, keyword, normalizedLimit);
    }

    @Override
    public Optional<CollaboratorProfile> findVisibleCollaborator(
            Long viewerId,
            Set<String> viewerRoles,
            Long targetUserId,
            CollaboratorRole targetRole) {
        if (viewerId == null || targetUserId == null || targetUserId < 1) {
            return Optional.empty();
        }
        if (!viewerId.equals(targetUserId)) {
            Set<Long> visibleIds = resolveVisibleUserIds(viewerId, viewerRoles);
            if (visibleIds.isEmpty()) {
                return Optional.empty();
            }
            if (targetRole != null) {
                visibleIds = applyTargetRoleFilter(visibleIds, targetRole);
            }
            if (!visibleIds.contains(targetUserId)) {
                return Optional.empty();
            }
        }
        return loadCollaboratorProfile(targetUserId);
    }

    private Optional<CollaboratorProfile> loadCollaboratorProfile(Long userId) {
        UserEntity user = userMapper.selectById(userId);
        if (user == null || user.getDeletedFlag() == 1 || !Status.ACTIVE.equals(user.getStatus())) {
            return Optional.empty();
        }
        List<UserRoleEntity> userRoles = userRoleMapper.selectList(new LambdaQueryWrapper<UserRoleEntity>()
                .eq(UserRoleEntity::getDeletedFlag, 0)
                .eq(UserRoleEntity::getUserId, userId));
        if (userRoles.isEmpty()) {
            return Optional.of(new CollaboratorProfile(
                    user.getId(),
                    user.getUsername(),
                    resolveDisplayName(user),
                    user.getEmail(),
                    user.getPhone(),
                    List.of(),
                    List.of()));
        }
        Set<Long> roleIds = userRoles.stream()
                .map(UserRoleEntity::getRoleId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<RoleEntity> roles = roleMapper.selectList(new LambdaQueryWrapper<RoleEntity>()
                .eq(RoleEntity::getDeletedFlag, 0)
                .eq(RoleEntity::getStatus, Status.ACTIVE)
                .in(RoleEntity::getId, roleIds));
        List<String> roleCodes = new ArrayList<>();
        List<String> roleNames = new ArrayList<>();
        for (RoleEntity role : roles) {
            if (role.getRoleCode() != null && !role.getRoleCode().isBlank()) {
                roleCodes.add(role.getRoleCode());
            }
            if (role.getRoleName() != null && !role.getRoleName().isBlank()) {
                roleNames.add(role.getRoleName());
            }
        }
        return Optional.of(new CollaboratorProfile(
                user.getId(),
                user.getUsername(),
                resolveDisplayName(user),
                user.getEmail(),
                user.getPhone(),
                List.copyOf(roleCodes),
                List.copyOf(roleNames)));
    }

    private String resolveDisplayName(UserEntity user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName();
        }
        return user.getUsername();
    }

    private Set<Long> resolveVisibleUserIds(Long viewerId, Set<String> viewerRoles) {
        Set<Long> visible = new LinkedHashSet<>();
        Set<String> roles = viewerRoles == null ? Set.of() : viewerRoles;
        if (roles.contains(UserRole.ADMIN.name())) {
            visible.addAll(adminVisibleUserIds());
        }
        if (roles.contains(UserRole.OWNER.name())) {
            visible.addAll(ownerVisibleUserIds(viewerId));
        }
        if (roles.contains(UserRole.LABELER.name())) {
            visible.addAll(labelerVisibleUserIds(viewerId));
        }
        if (roles.contains(UserRole.REVIEWER.name())) {
            visible.addAll(reviewerVisibleUserIds(viewerId));
        }
        visible.remove(null);
        visible.remove(viewerId);
        return visible;
    }

    private Set<Long> ownerVisibleUserIds(Long ownerId) {
        Set<Long> visible = new LinkedHashSet<>();
        visible.addAll(standardLabelerAndReviewerUserIds());
        if (ownerId != null) {
            visible.addAll(ownerTaskCollaboratorIds(ownerId));
        }
        visible.remove(null);
        return visible;
    }

    /** Admin 可见全平台标准标注/审核角色用户，以及各任务上的协作参与者。 */
    private Set<Long> adminVisibleUserIds() {
        Set<Long> visible = new LinkedHashSet<>();
        visible.addAll(standardLabelerAndReviewerUserIds());
        visible.addAll(platformTaskCollaboratorIds());
        visible.remove(null);
        return visible;
    }

    private Set<Long> standardLabelerAndReviewerUserIds() {
        Set<Long> visible = new LinkedHashSet<>();
        Set<Long> roleIds = resolveRoleIds(UserRole.LABELER.name(), UserRole.REVIEWER.name());
        if (roleIds.isEmpty()) {
            return visible;
        }
        userRoleMapper
                .selectList(new LambdaQueryWrapper<UserRoleEntity>()
                        .eq(UserRoleEntity::getDeletedFlag, 0)
                        .in(UserRoleEntity::getRoleId, roleIds))
                .stream()
                .map(UserRoleEntity::getUserId)
                .forEach(visible::add);
        visible.remove(null);
        return visible;
    }

    /** 全平台任务上的成员、标注员、审核员（含 SEED_REVIEWER_L* 等非标准角色码） */
    private Set<Long> platformTaskCollaboratorIds() {
        Set<Long> visible = new LinkedHashSet<>();
        taskMemberMapper
                .selectList(new LambdaQueryWrapper<TaskMemberEntity>()
                        .eq(TaskMemberEntity::getDeletedFlag, 0))
                .stream()
                .map(TaskMemberEntity::getUserId)
                .forEach(visible::add);
        assignmentMapper
                .selectList(new LambdaQueryWrapper<AssignmentEntity>()
                        .eq(AssignmentEntity::getDeletedFlag, 0))
                .stream()
                .map(AssignmentEntity::getLabelerId)
                .forEach(visible::add);
        reviewRecordMapper
                .selectList(new LambdaQueryWrapper<ReviewRecordEntity>()
                        .eq(ReviewRecordEntity::getDeletedFlag, 0))
                .stream()
                .map(ReviewRecordEntity::getReviewerId)
                .forEach(visible::add);
        visible.remove(null);
        return visible;
    }

    /** Owner 名下任务上的成员、标注员、审核员（含 SEED_REVIEWER_L* 等非标准角色码） */
    private Set<Long> ownerTaskCollaboratorIds(Long ownerId) {
        Set<Long> visible = new LinkedHashSet<>();
        List<TaskEntity> tasks = taskMapper.selectList(new LambdaQueryWrapper<TaskEntity>()
                .eq(TaskEntity::getDeletedFlag, 0)
                .eq(TaskEntity::getOwnerId, ownerId));
        if (tasks.isEmpty()) {
            return visible;
        }
        Set<Long> taskIds = tasks.stream()
                .map(TaskEntity::getId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (taskIds.isEmpty()) {
            return visible;
        }
        taskMemberMapper
                .selectList(new LambdaQueryWrapper<TaskMemberEntity>()
                        .eq(TaskMemberEntity::getDeletedFlag, 0)
                        .in(TaskMemberEntity::getTaskId, taskIds))
                .stream()
                .map(TaskMemberEntity::getUserId)
                .forEach(visible::add);
        assignmentMapper
                .selectList(new LambdaQueryWrapper<AssignmentEntity>()
                        .eq(AssignmentEntity::getDeletedFlag, 0)
                        .in(AssignmentEntity::getTaskId, taskIds))
                .stream()
                .map(AssignmentEntity::getLabelerId)
                .forEach(visible::add);
        reviewRecordMapper
                .selectList(new LambdaQueryWrapper<ReviewRecordEntity>()
                        .eq(ReviewRecordEntity::getDeletedFlag, 0)
                        .in(ReviewRecordEntity::getTaskId, taskIds))
                .stream()
                .map(ReviewRecordEntity::getReviewerId)
                .forEach(visible::add);
        visible.remove(null);
        return visible;
    }

    private Set<Long> labelerVisibleUserIds(Long labelerId) {
        Set<Long> visible = new LinkedHashSet<>();
        List<AssignmentEntity> assignments = assignmentMapper.selectList(new LambdaQueryWrapper<AssignmentEntity>()
                .eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getLabelerId, labelerId));
        if (assignments.isEmpty()) {
            return visible;
        }
        Set<Long> taskIds = assignments.stream()
                .map(AssignmentEntity::getTaskId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!taskIds.isEmpty()) {
            taskMapper.selectList(new LambdaQueryWrapper<TaskEntity>()
                            .eq(TaskEntity::getDeletedFlag, 0)
                            .in(TaskEntity::getId, taskIds))
                    .stream()
                    .map(TaskEntity::getOwnerId)
                    .forEach(visible::add);
        }
        Set<Long> assignmentIds = assignments.stream()
                .map(AssignmentEntity::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        reviewRecordMapper
                .selectList(new LambdaQueryWrapper<ReviewRecordEntity>()
                        .eq(ReviewRecordEntity::getDeletedFlag, 0)
                        .in(ReviewRecordEntity::getAssignmentId, assignmentIds))
                .stream()
                .map(ReviewRecordEntity::getReviewerId)
                .forEach(visible::add);
        return visible;
    }

    private Set<Long> reviewerVisibleUserIds(Long reviewerId) {
        Set<Long> visible = new LinkedHashSet<>();
        List<ReviewRecordEntity> reviews = reviewRecordMapper.selectList(new LambdaQueryWrapper<ReviewRecordEntity>()
                .eq(ReviewRecordEntity::getDeletedFlag, 0)
                .eq(ReviewRecordEntity::getReviewerId, reviewerId));
        if (reviews.isEmpty()) {
            return visible;
        }
        Set<Long> taskIds = reviews.stream()
                .map(ReviewRecordEntity::getTaskId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!taskIds.isEmpty()) {
            taskMapper.selectList(new LambdaQueryWrapper<TaskEntity>()
                            .eq(TaskEntity::getDeletedFlag, 0)
                            .in(TaskEntity::getId, taskIds))
                    .stream()
                    .map(TaskEntity::getOwnerId)
                    .forEach(visible::add);
        }
        Set<Long> assignmentIds = reviews.stream()
                .map(ReviewRecordEntity::getAssignmentId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!assignmentIds.isEmpty()) {
            assignmentMapper
                    .selectList(new LambdaQueryWrapper<AssignmentEntity>()
                            .eq(AssignmentEntity::getDeletedFlag, 0)
                            .in(AssignmentEntity::getId, assignmentIds))
                    .stream()
                    .map(AssignmentEntity::getLabelerId)
                    .forEach(visible::add);
        }
        return visible;
    }

    private Set<Long> applyTargetRoleFilter(Set<Long> visibleIds, CollaboratorRole targetRole) {
        return switch (targetRole) {
            case LABELER -> filterLabelerCollaborators(visibleIds);
            case REVIEWER -> filterReviewerCollaborators(visibleIds);
            case OWNER -> filterTaskOwners(visibleIds);
        };
    }

    private Set<Long> filterLabelerCollaborators(Set<Long> visibleIds) {
        Set<Long> filtered = new LinkedHashSet<>(filterUsersWithRole(visibleIds, UserRole.LABELER.name()));
        filtered.addAll(filterTaskMembersWithRole(visibleIds, UserRole.LABELER.name()));
        filtered.addAll(filterAssignmentLabelers(visibleIds));
        return filtered;
    }

    private Set<Long> filterReviewerCollaborators(Set<Long> visibleIds) {
        Set<Long> filtered = new LinkedHashSet<>(filterUsersWithRole(visibleIds, UserRole.REVIEWER.name()));
        filtered.addAll(filterTaskMembersWithRole(visibleIds, UserRole.REVIEWER.name()));
        filtered.addAll(filterReviewRecordReviewers(visibleIds));
        return filtered;
    }

    private Set<Long> filterTaskMembersWithRole(Set<Long> userIds, String memberRole) {
        if (userIds.isEmpty()) {
            return Set.of();
        }
        return taskMemberMapper
                .selectList(new LambdaQueryWrapper<TaskMemberEntity>()
                        .eq(TaskMemberEntity::getDeletedFlag, 0)
                        .eq(TaskMemberEntity::getMemberRole, memberRole)
                        .in(TaskMemberEntity::getUserId, userIds))
                .stream()
                .map(TaskMemberEntity::getUserId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Long> filterAssignmentLabelers(Set<Long> userIds) {
        if (userIds.isEmpty()) {
            return Set.of();
        }
        return assignmentMapper
                .selectList(new LambdaQueryWrapper<AssignmentEntity>()
                        .eq(AssignmentEntity::getDeletedFlag, 0)
                        .in(AssignmentEntity::getLabelerId, userIds))
                .stream()
                .map(AssignmentEntity::getLabelerId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Long> filterReviewRecordReviewers(Set<Long> userIds) {
        if (userIds.isEmpty()) {
            return Set.of();
        }
        return reviewRecordMapper
                .selectList(new LambdaQueryWrapper<ReviewRecordEntity>()
                        .eq(ReviewRecordEntity::getDeletedFlag, 0)
                        .in(ReviewRecordEntity::getReviewerId, userIds))
                .stream()
                .map(ReviewRecordEntity::getReviewerId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Long> filterUsersWithRole(Set<Long> userIds, String roleCode) {
        Set<Long> roleIds = resolveRoleIds(roleCode);
        if (roleIds.isEmpty() || userIds.isEmpty()) {
            return Set.of();
        }
        return userRoleMapper
                .selectList(new LambdaQueryWrapper<UserRoleEntity>()
                        .eq(UserRoleEntity::getDeletedFlag, 0)
                        .in(UserRoleEntity::getRoleId, roleIds)
                        .in(UserRoleEntity::getUserId, userIds))
                .stream()
                .map(UserRoleEntity::getUserId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Long> filterTaskOwners(Set<Long> userIds) {
        if (userIds.isEmpty()) {
            return Set.of();
        }
        return taskMapper
                .selectList(new LambdaQueryWrapper<TaskEntity>()
                        .eq(TaskEntity::getDeletedFlag, 0)
                        .in(TaskEntity::getOwnerId, userIds))
                .stream()
                .map(TaskEntity::getOwnerId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<OptionItem> loadActiveUserOptions(Set<Long> userIds, String keyword, int limit) {
        LambdaQueryWrapper<UserEntity> wrapper = new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getDeletedFlag, 0)
                .eq(UserEntity::getStatus, Status.ACTIVE)
                .in(UserEntity::getId, userIds)
                .orderByAsc(UserEntity::getDisplayName)
                .last("LIMIT " + limit);
        if (keyword != null && !keyword.isBlank()) {
            String normalized = keyword.trim();
            wrapper.and(item -> item.like(UserEntity::getDisplayName, normalized)
                    .or()
                    .like(UserEntity::getUsername, normalized));
        }
        return userMapper.selectList(wrapper).stream()
                .map(user -> new OptionItem(user.getDisplayName(), user.getId()))
                .toList();
    }

    private Set<Long> resolveRoleIds(String... roleCodes) {
        if (roleCodes == null || roleCodes.length == 0) {
            return Set.of();
        }
        List<String> normalized = new ArrayList<>();
        for (String roleCode : roleCodes) {
            if (roleCode != null && !roleCode.isBlank()) {
                normalized.add(roleCode.trim().toUpperCase(Locale.ROOT));
            }
        }
        if (normalized.isEmpty()) {
            return Set.of();
        }
        return roleMapper
                .selectList(new LambdaQueryWrapper<RoleEntity>()
                        .eq(RoleEntity::getDeletedFlag, 0)
                        .eq(RoleEntity::getStatus, Status.ACTIVE)
                        .in(RoleEntity::getRoleCode, normalized))
                .stream()
                .map(RoleEntity::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
