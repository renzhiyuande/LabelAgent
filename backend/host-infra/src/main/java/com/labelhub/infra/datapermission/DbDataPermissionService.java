package com.labelhub.infra.datapermission;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.datapermission.DataPermissionService;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScopePolicy;
import com.labelhub.core.datapermission.DataScopeType;
import com.labelhub.core.datapermission.ResolvedDataScope;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.DataScopePolicyEntity;
import com.labelhub.infra.persistence.entity.RoleDataScopeEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.mapper.DataScopePolicyMapper;
import com.labelhub.infra.persistence.mapper.RoleDataScopeMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbDataPermissionService implements DataPermissionService {
    private final RoleMapper roleMapper;
    private final RoleDataScopeMapper roleDataScopeMapper;
    private final DataScopePolicyMapper dataScopePolicyMapper;

    public DbDataPermissionService(
            RoleMapper roleMapper,
            RoleDataScopeMapper roleDataScopeMapper,
            DataScopePolicyMapper dataScopePolicyMapper) {
        this.roleMapper = roleMapper;
        this.roleDataScopeMapper = roleDataScopeMapper;
        this.dataScopePolicyMapper = dataScopePolicyMapper;
    }

    @Override
    public Set<DataResourceType> listGrantedResourceTypes(Set<String> roleCodes) {
        if (roleCodes == null || roleCodes.isEmpty()) {
            return Set.of();
        }
        Set<Long> roleIds = resolveRoleIds(roleCodes);
        if (roleIds.isEmpty()) {
            return Set.of();
        }
        List<RoleDataScopeEntity> relations = roleDataScopeMapper
                .selectList(new LambdaQueryWrapper<RoleDataScopeEntity>()
                        .eq(RoleDataScopeEntity::getDeletedFlag, 0)
                        .in(RoleDataScopeEntity::getRoleId, roleIds));
        if (relations.isEmpty()) {
            return Set.of();
        }
        List<DataScopePolicyEntity> policies = dataScopePolicyMapper.selectBatchIds(
                relations.stream().map(RoleDataScopeEntity::getPolicyId).distinct().toList());
        return policies.stream()
                .filter(policy -> policy.getDeletedFlag() == 0 && Status.ACTIVE.equals(policy.getStatus()))
                .map(policy -> DataResourceType.valueOf(policy.getResourceType()))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    public ResolvedDataScope resolve(Set<String> roleCodes, DataResourceType resourceType) {
        if (roleCodes == null || roleCodes.isEmpty()) {
            return new ResolvedDataScope(resourceType, List.of());
        }
        Set<Long> roleIds = resolveRoleIds(roleCodes);
        if (roleIds.isEmpty()) {
            return new ResolvedDataScope(resourceType, List.of());
        }
        List<RoleDataScopeEntity> relations = roleDataScopeMapper
                .selectList(new LambdaQueryWrapper<RoleDataScopeEntity>()
                        .eq(RoleDataScopeEntity::getDeletedFlag, 0)
                        .in(RoleDataScopeEntity::getRoleId, roleIds));
        if (relations.isEmpty()) {
            return new ResolvedDataScope(resourceType, List.of());
        }
        Map<Long, DataScopePolicyEntity> policies = dataScopePolicyMapper.selectBatchIds(
                relations.stream().map(RoleDataScopeEntity::getPolicyId).distinct().toList())
                .stream()
                .filter(policy -> policy.getDeletedFlag() == 0
                        && Status.ACTIVE.equals(policy.getStatus())
                        && resourceType.name().equals(policy.getResourceType()))
                .collect(Collectors.toMap(DataScopePolicyEntity::getId, Function.identity()));
        List<DataScopePolicy> resolved = new ArrayList<>();
        for (RoleDataScopeEntity relation : relations) {
            DataScopePolicyEntity entity = policies.get(relation.getPolicyId());
            if (entity != null) {
                resolved.add(toPolicy(entity));
            }
        }
        return new ResolvedDataScope(resourceType, resolved);
    }

    public DataPermissionRule buildRule(Set<String> roleCodes, DataResourceType resourceType, Long userId) {
        List<DataScopePolicy> policies = resolve(roleCodes, resourceType).policies();
        List<SqlPredicate> predicates = new ArrayList<>();
        for (DataScopePolicy policy : policies) {
            switch (resourceType) {
                case TASK -> appendTaskPredicates(policy, userId, predicates);
                case ASSIGNMENT -> appendAssignmentPredicates(policy, userId, predicates);
                case REVIEW -> appendReviewPredicates(policy, userId, predicates);
                case FILE -> appendFilePredicates(policy, userId, predicates);
                case PROJECT -> {
                    // Model only in this stage.
                }
            }
        }
        return new DataPermissionRule(resourceType, roleCodes, policies, predicates);
    }

    private Set<Long> resolveRoleIds(Set<String> roleCodes) {
        return roleMapper.selectList(new LambdaQueryWrapper<RoleEntity>()
                .eq(RoleEntity::getDeletedFlag, 0)
                .eq(RoleEntity::getStatus, Status.ACTIVE)
                .in(RoleEntity::getRoleCode, roleCodes))
                .stream()
                .map(RoleEntity::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private DataScopePolicy toPolicy(DataScopePolicyEntity entity) {
        return new DataScopePolicy(
                entity.getId(),
                entity.getPolicyCode(),
                entity.getPolicyName(),
                DataResourceType.valueOf(entity.getResourceType()),
                DataScopeType.valueOf(entity.getScopeType()),
                entity.getScopeValueJson(),
                entity.getStatus(),
                entity.getRemark());
    }

    private void appendTaskPredicates(DataScopePolicy policy, Long userId, List<SqlPredicate> predicates) {
        switch (policy.scopeType()) {
            case ALL -> predicates.add(SqlPredicate.of("1=1"));
            case TASK_OWNER, CREATED_BY_ME -> predicates.add(SqlPredicate.of("tasks.owner_id = ?", userId));
            case TASK_MEMBER, ASSIGNED_TO_ME -> predicates.add(
                    SqlPredicate.of(
                            "tasks.id IN (SELECT tm.task_id FROM task_members tm WHERE tm.deleted_flag = 0 AND tm.user_id = ?)",
                            userId));
            default -> {
            }
        }
    }

    private void appendAssignmentPredicates(DataScopePolicy policy, Long userId, List<SqlPredicate> predicates) {
        switch (policy.scopeType()) {
            case ALL -> predicates.add(SqlPredicate.of("1=1"));
            case ASSIGNED_TO_ME -> predicates.add(SqlPredicate.of("assignments.labeler_id = ?", userId));
            case TASK_OWNER, CREATED_BY_ME -> predicates.add(
                    SqlPredicate.of(
                            "assignments.task_id IN (SELECT t.id FROM tasks t WHERE t.deleted_flag = 0 AND t.owner_id = ?)",
                            userId));
            case TASK_MEMBER -> predicates.add(
                    SqlPredicate.of(
                            "assignments.task_id IN (SELECT tm.task_id FROM task_members tm WHERE tm.deleted_flag = 0 AND tm.user_id = ?)",
                            userId));
            default -> {
            }
        }
    }

    /**
     * REVIEW 资源的数据范围目前用于审核工作台对 {@code submissions} 的列表查询（AI 队列、人工池），
     * 谓词须使用 submissions 表字段，不可引用未参与 JOIN 的 review_records。
     */
    private void appendReviewPredicates(DataScopePolicy policy, Long userId, List<SqlPredicate> predicates) {
        switch (policy.scopeType()) {
            case ALL -> predicates.add(SqlPredicate.of("1=1"));
            case REVIEWER, ASSIGNED_TO_ME -> predicates.add(
                    SqlPredicate.of(
                            "id IN (SELECT rr.submission_id FROM review_records rr WHERE rr.deleted_flag = 0 AND rr.reviewer_id = ?)",
                            userId));
            case TASK_OWNER, CREATED_BY_ME -> predicates.add(
                    SqlPredicate.of(
                            "task_id IN (SELECT t.id FROM tasks t WHERE t.deleted_flag = 0 AND t.owner_id = ?)",
                            userId));
            case TASK_MEMBER -> predicates.add(
                    SqlPredicate.of(
                            "task_id IN (SELECT tm.task_id FROM task_members tm WHERE tm.deleted_flag = 0"
                                    + " AND tm.status = 'ACTIVE' AND tm.member_role = 'REVIEWER' AND tm.user_id = ?)",
                            userId));
            default -> {
            }
        }
    }

    private void appendFilePredicates(DataScopePolicy policy, Long userId, List<SqlPredicate> predicates) {
        switch (policy.scopeType()) {
            case ALL -> predicates.add(SqlPredicate.of("1=1"));
            case CREATED_BY_ME -> predicates.add(SqlPredicate.of("file_assets.uploaded_by = ?", userId));
            case PUBLIC_OR_OWN -> predicates.add(
                    SqlPredicate.of(
                            "(file_assets.uploaded_by = ? OR file_assets.is_public = 1)",
                            userId));
            default -> {
            }
        }
    }
}
