package com.labelhub.infra.system.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScopeCatalog;
import com.labelhub.core.datapermission.DataScopeType;
import com.labelhub.core.system.SystemDtos.AssignDataScopesCommand;
import com.labelhub.core.system.SystemDtos.DataScopePolicyCommand;
import com.labelhub.core.system.SystemDtos.DataScopePolicySummary;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.system.SystemDtos.RoleDataScopeSummary;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.DataScopePolicyEntity;
import com.labelhub.infra.persistence.entity.RoleDataScopeEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.mapper.DataScopePolicyMapper;
import com.labelhub.infra.persistence.mapper.RoleDataScopeMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import com.labelhub.infra.system.admin.mapper.DataScopeAdminMapper;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DataScopeAdminService {
    private final DataScopePolicyMapper dataScopePolicyMapper;
    private final RoleDataScopeMapper roleDataScopeMapper;
    private final RoleMapper roleMapper;
    private final AdminSupport adminSupport;
    private final DataScopeAdminMapper dataScopeAdminMapper;

    public DataScopeAdminService(
            DataScopePolicyMapper dataScopePolicyMapper,
            RoleDataScopeMapper roleDataScopeMapper,
            RoleMapper roleMapper,
            AdminSupport adminSupport,
            DataScopeAdminMapper dataScopeAdminMapper) {
        this.dataScopePolicyMapper = dataScopePolicyMapper;
        this.roleDataScopeMapper = roleDataScopeMapper;
        this.roleMapper = roleMapper;
        this.adminSupport = adminSupport;
        this.dataScopeAdminMapper = dataScopeAdminMapper;
    }

    @RequireAnyPermission({ "system:data-scope:read", "system:admin" })
    public PageResponse<DataScopePolicySummary> listPolicies(PageQuery query) {
        LambdaQueryWrapper<DataScopePolicyEntity> wrapper = adminSupport.<DataScopePolicyEntity>activeWrapper();
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.like(DataScopePolicyEntity::getPolicyCode, query.keyword());
        }
        var page = dataScopePolicyMapper.selectPage(adminSupport.page(query), wrapper);
        return PageResponse.of(page.getTotal(), query.normalizedPage(), query.normalizedPageSize(),
                page.getRecords().stream().map(this::toSummary).toList());
    }

    @RequireAnyPermission({ "system:data-scope:read", "system:admin" })
    public DataScopePolicySummary getPolicy(Long id) {
        return toSummary(adminSupport.requireEntity(dataScopePolicyMapper.selectById(id), "data scope policy"));
    }

    @Transactional
    @RequireAnyPermission({ "system:data-scope:write", "system:admin" })
    @Audit(entityType = "DATA_SCOPE_POLICY", actionCode = "dataScope.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public DataScopePolicySummary createPolicy(DataScopePolicyCommand command) {
        DataScopeCatalog.ensureSupported(command.resourceType(), command.scopeType());
        DataScopePolicyEntity entity = new DataScopePolicyEntity();
        dataScopeAdminMapper.apply(command, entity);
        entity.setStatus(Status.ACTIVE);
        dataScopePolicyMapper.insert(entity);
        return getPolicy(entity.getId());
    }

    @Transactional
    @RequireAnyPermission({ "system:data-scope:write", "system:admin" })
    @Audit(entityType = "DATA_SCOPE_POLICY", actionCode = "dataScope.update", entityId = "#id")
    public DataScopePolicySummary updatePolicy(Long id, DataScopePolicyCommand command) {
        DataScopeCatalog.ensureSupported(command.resourceType(), command.scopeType());
        DataScopePolicyEntity entity = adminSupport.requireEntity(dataScopePolicyMapper.selectById(id),
                "data scope policy");
        dataScopeAdminMapper.apply(command, entity);
        dataScopePolicyMapper.updateById(entity);
        return getPolicy(id);
    }

    @Transactional
    @RequireAnyPermission({ "system:data-scope:write", "system:admin" })
    @Audit(entityType = "DATA_SCOPE_POLICY", actionCode = "dataScope.status", entityId = "#id")
    public void setPolicyStatus(Long id, String status) {
        DataScopePolicyEntity entity = adminSupport.requireEntity(dataScopePolicyMapper.selectById(id),
                "data scope policy");
        entity.setStatus(status);
        dataScopePolicyMapper.updateById(entity);
    }

    @RequireAnyPermission({ "system:data-scope:read", "system:admin" })
    public RoleDataScopeSummary getRolePolicies(Long roleId) {
        RoleEntity role = adminSupport.requireEntity(roleMapper.selectById(roleId), "role");
        List<RoleDataScopeEntity> relations = roleDataScopeMapper
                .selectList(new LambdaQueryWrapper<RoleDataScopeEntity>()
                        .eq(RoleDataScopeEntity::getDeletedFlag, 0)
                        .eq(RoleDataScopeEntity::getRoleId, roleId));
        List<DataScopePolicySummary> policies = relations.isEmpty()
                ? List.of()
                : dataScopePolicyMapper
                        .selectBatchIds(relations.stream().map(RoleDataScopeEntity::getPolicyId).toList()).stream()
                        .filter(policy -> policy.getDeletedFlag() == 0)
                        .map(this::toSummary)
                        .toList();
        return new RoleDataScopeSummary(roleId, role.getRoleCode(), policies);
    }

    @Transactional
    @RequireAnyPermission({ "system:data-scope:write", "system:admin" })
    @Audit(entityType = "ROLE", actionCode = "role.assignDataScopes", entityId = "#roleId", before = AuditSnapshotSource.EXPRESSION, beforeExpression = "#target.getRolePolicies(#roleId)", after = AuditSnapshotSource.EXPRESSION, afterExpression = "#target.getRolePolicies(#roleId)")
    public void assignRolePolicies(Long roleId, AssignDataScopesCommand command) {
        adminSupport.requireEntity(roleMapper.selectById(roleId), "role");
        List<RoleDataScopeEntity> existing = roleDataScopeMapper
                .selectList(new LambdaQueryWrapper<RoleDataScopeEntity>()
                        .eq(RoleDataScopeEntity::getRoleId, roleId));
        List<Long> targetPolicyIds = command.policyIds().stream().map(Long::valueOf).distinct().toList();
        for (Long policyId : targetPolicyIds) {
            adminSupport.requireEntity(dataScopePolicyMapper.selectById(policyId), "data scope policy");
        }
        RelationAssignmentSync.sync(
                existing,
                targetPolicyIds,
                RoleDataScopeEntity::getPolicyId,
                (entity, policyId) -> {
                    entity.setRoleId(roleId);
                    entity.setPolicyId(policyId);
                },
                RoleDataScopeEntity::new,
                roleDataScopeMapper::insert,
                roleDataScopeMapper::updateById,
                entity -> roleDataScopeMapper.deleteById(entity.getId()));
    }

    @RequireAnyPermission({ "system:data-scope:read", "system:admin" })
    public Map<String, Object> describeResolvedScope(Long roleId, DataResourceType resourceType) {
        RoleEntity role = adminSupport.requireEntity(roleMapper.selectById(roleId), "role");
        RoleDataScopeSummary summary = getRolePolicies(roleId);
        List<DataScopePolicySummary> matched = summary.policies().stream()
                .filter(policy -> policy.resourceType() == resourceType)
                .toList();
        List<String> scopeTypes = matched.stream().map(policy -> policy.scopeType().name()).toList();
        return Map.of(
                "roleId", roleId,
                "roleCode", role.getRoleCode(),
                "resourceType", resourceType.name(),
                "policies", matched,
                "scopeTypes", scopeTypes);
    }

    public Map<Long, List<DataScopePolicySummary>> policyMapForRoles(List<Long> roleIds) {
        if (roleIds.isEmpty()) {
            return Map.of();
        }
        List<RoleDataScopeEntity> relations = roleDataScopeMapper
                .selectList(new LambdaQueryWrapper<RoleDataScopeEntity>()
                        .eq(RoleDataScopeEntity::getDeletedFlag, 0)
                        .in(RoleDataScopeEntity::getRoleId, roleIds));
        Map<Long, DataScopePolicySummary> policies = dataScopePolicyMapper.selectBatchIds(
                relations.stream().map(RoleDataScopeEntity::getPolicyId).distinct().toList())
                .stream()
                .filter(policy -> policy.getDeletedFlag() == 0)
                .map(this::toSummary)
                .collect(Collectors.toMap(DataScopePolicySummary::id, Function.identity()));
        Map<Long, List<DataScopePolicySummary>> result = new LinkedHashMap<>();
        for (RoleDataScopeEntity relation : relations) {
            DataScopePolicySummary summary = policies.get(relation.getPolicyId());
            if (summary != null) {
                result.computeIfAbsent(relation.getRoleId(), ignored -> new ArrayList<>()).add(summary);
            }
        }
        return result;
    }

    public DataScopePolicySummary toSummary(DataScopePolicyEntity entity) {
        return dataScopeAdminMapper.toSummary(entity);
    }
}
