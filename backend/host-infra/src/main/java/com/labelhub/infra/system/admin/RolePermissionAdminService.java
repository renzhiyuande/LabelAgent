package com.labelhub.infra.system.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.system.SystemDtos.AssignMenusCommand;
import com.labelhub.core.system.SystemDtos.AssignPermissionsCommand;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.system.SystemDtos.PermissionCommand;
import com.labelhub.core.system.SystemDtos.PermissionSummary;
import com.labelhub.core.system.SystemDtos.RoleMenuAssignment;
import com.labelhub.core.system.SystemDtos.RolePermissionAssignment;
import com.labelhub.core.system.SystemDtos.RoleCommand;
import com.labelhub.core.system.SystemDtos.RoleSummary;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.MenuEntity;
import com.labelhub.infra.persistence.entity.PermissionEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.entity.RoleMenuEntity;
import com.labelhub.infra.persistence.entity.RolePermissionEntity;
import com.labelhub.infra.persistence.mapper.MenuMapper;
import com.labelhub.infra.persistence.mapper.PermissionMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import com.labelhub.infra.persistence.mapper.RoleMenuMapper;
import com.labelhub.infra.persistence.mapper.RolePermissionMapper;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.RoleQuerySpec;
import com.labelhub.infra.system.admin.mapper.RolePermissionAdminMapper;

import java.util.*;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class RolePermissionAdminService {
    private static final ResourceQuerySpec<RoleEntity> QUERY_SPEC = RoleQuerySpec.build();

    private final RoleMapper roleMapper;
    private final MenuMapper menuMapper;
    private final PermissionMapper permissionMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final RoleMenuMapper roleMenuMapper;
    private final AdminSupport adminSupport;
    private final MybatisQueryApplier queryApplier;
    private final RolePermissionAdminMapper rolePermissionAdminMapper;
    private final AdminSafetyGuard adminSafetyGuard;
    private final com.labelhub.infra.auth.AuthUserCacheService authUserCacheService;
    private final com.labelhub.infra.persistence.mapper.UserRoleMapper userRoleMapper;

    public RolePermissionAdminService(
            RoleMapper roleMapper,
            MenuMapper menuMapper,
            PermissionMapper permissionMapper,
            RolePermissionMapper rolePermissionMapper,
            RoleMenuMapper roleMenuMapper,
            AdminSupport adminSupport,
            MybatisQueryApplier queryApplier,
            RolePermissionAdminMapper rolePermissionAdminMapper,
            AdminSafetyGuard adminSafetyGuard,
            com.labelhub.infra.auth.AuthUserCacheService authUserCacheService,
            com.labelhub.infra.persistence.mapper.UserRoleMapper userRoleMapper) {
        this.roleMapper = roleMapper;
        this.menuMapper = menuMapper;
        this.permissionMapper = permissionMapper;
        this.rolePermissionMapper = rolePermissionMapper;
        this.roleMenuMapper = roleMenuMapper;
        this.adminSupport = adminSupport;
        this.queryApplier = queryApplier;
        this.rolePermissionAdminMapper = rolePermissionAdminMapper;
        this.adminSafetyGuard = adminSafetyGuard;
        this.authUserCacheService = authUserCacheService;
        this.userRoleMapper = userRoleMapper;
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<RoleSummary> listRoles(PageQuery query) {
        var wrapper = adminSupport.<RoleEntity>activeWrapper();
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.like(RoleEntity::getRoleCode, query.keyword());
        }
        var page = roleMapper.selectPage(adminSupport.page(query), wrapper);
        return PageResponse.of(page.getTotal(), query.normalizedPage(), query.normalizedPageSize(),
                page.getRecords().stream().map(this::toRoleSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<RoleSummary> listRoles(ParsedListQuery query) {
        var wrapper = adminSupport.<RoleEntity>activeWrapper();
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.and(item -> item.like(RoleEntity::getRoleCode, query.keyword()).or()
                    .like(RoleEntity::getRoleName, query.keyword()));
        }
        queryApplier.apply(wrapper, query, QUERY_SPEC);
        var page = roleMapper.selectPage(adminSupport.page(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(page.getTotal(), query.page(), query.pageSize(),
                page.getRecords().stream().map(this::toRoleSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public RoleSummary getRole(Long id) {
        return toRoleSummary(adminSupport.requireEntity(roleMapper.selectById(id), "role"));
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "ROLE", actionCode = "role.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public RoleSummary createRole(RoleCommand command) {
        RoleEntity entity = new RoleEntity();
        rolePermissionAdminMapper.applyRole(command, entity);
        entity.setStatus(Status.ACTIVE);
        roleMapper.insert(entity);
        return getRole(entity.getId());
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "ROLE", actionCode = "role.update", entityId = "#id")
    public RoleSummary updateRole(Long id, RoleCommand command) {
        RoleEntity entity = adminSupport.requireEntity(roleMapper.selectById(id), "role");
        rolePermissionAdminMapper.applyRole(command, entity);
        roleMapper.updateById(entity);
        return getRole(id);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "ROLE", actionCode = "role.status", entityId = "#id")
    public void setRoleStatus(Long id, String status) {
        adminSafetyGuard.requireCanSetRoleStatus(id, status);
        RoleEntity entity = adminSupport.requireEntity(roleMapper.selectById(id), "role");
        entity.setStatus(status);
        roleMapper.updateById(entity);
        evictCacheByRoleId(id);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "ROLE", actionCode = "role.assignPermissions", entityId = "#id",
            before = AuditSnapshotSource.EXPRESSION, beforeExpression = "#target.getRole(#id)",
            after = AuditSnapshotSource.EXPRESSION, afterExpression = "#target.getRole(#id)")
    public void assignRolePermissions(Long id, AssignPermissionsCommand command) {
        adminSupport.requireEntity(roleMapper.selectById(id), "role");
        adminSafetyGuard.requireCanAssignRolePermissions(id, command.permissionIds());
        List<RolePermissionEntity> existing = rolePermissionMapper.selectList(new LambdaQueryWrapper<RolePermissionEntity>()
                .eq(RolePermissionEntity::getRoleId, id));
        List<Long> targetPermissionIds = command.permissionIds().stream().map(Long::valueOf).distinct().toList();
        RelationAssignmentSync.sync(
                existing,
                targetPermissionIds,
                RolePermissionEntity::getPermissionId,
                (entity, permissionId) -> {
                    entity.setRoleId(id);
                    entity.setPermissionId(permissionId);
                    entity.setGrantSource("MANUAL");
                },
                RolePermissionEntity::new,
                rolePermissionMapper::insert,
                rolePermissionMapper::updateById,
                entity -> rolePermissionMapper.deleteById(entity.getId()),
                entity -> {
                    if (!"MANUAL".equals(entity.getGrantSource())) {
                        entity.setGrantSource("MANUAL");
                    }
                });
        evictCacheByRoleId(id);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "ROLE", actionCode = "role.assignMenus", entityId = "#id",
            before = AuditSnapshotSource.EXPRESSION, beforeExpression = "#target.getRole(#id)",
            after = AuditSnapshotSource.EXPRESSION, afterExpression = "#target.getRole(#id)")
    public void assignRoleMenus(Long id, AssignMenusCommand command) {
        adminSupport.requireEntity(roleMapper.selectById(id), "role");
        List<RoleMenuEntity> existing = roleMenuMapper.selectList(new LambdaQueryWrapper<RoleMenuEntity>()
                .eq(RoleMenuEntity::getRoleId, id));
        List<Long> targetMenuIds = command.menuIds().stream().map(Long::valueOf).distinct().toList();
        RelationAssignmentSync.sync(
                existing,
                targetMenuIds,
                RoleMenuEntity::getMenuId,
                (entity, menuId) -> {
                    entity.setRoleId(id);
                    entity.setMenuId(menuId);
                    entity.setGrantScope("VISIBLE");
                },
                RoleMenuEntity::new,
                roleMenuMapper::insert,
                roleMenuMapper::updateById,
                entity -> roleMenuMapper.deleteById(entity.getId()),
                entity -> {
                    if (!"VISIBLE".equals(entity.getGrantScope())) {
                        entity.setGrantScope("VISIBLE");
                    }
                });
        evictCacheByRoleId(id);
    }

    @RequireAnyPermission({"system:admin"})
    public List<RolePermissionAssignment> getRolePermissionAssignments(Long id) {
        adminSupport.requireEntity(roleMapper.selectById(id), "role");
        List<RolePermissionEntity> relations = rolePermissionMapper.selectList(new LambdaQueryWrapper<RolePermissionEntity>()
                .eq(RolePermissionEntity::getDeletedFlag, 0)
                .eq(RolePermissionEntity::getRoleId, id));
        if (relations.isEmpty()) {
            return List.of();
        }
        return permissionMapper.selectBatchIds(relations.stream().map(RolePermissionEntity::getPermissionId).toList()).stream()
                .filter(permission -> permission.getDeletedFlag() == 0)
                .collect(Collectors.toMap(PermissionEntity::getId, permission -> permission, (left, right) -> left, LinkedHashMap::new))
                .values().stream()
                .map(permission -> new RolePermissionAssignment(
                        permission.getId(),
                        permission.getPermissionCode(),
                        permission.getPermissionName()))
                .toList();
    }

    @RequireAnyPermission({"system:admin"})
    public List<RoleMenuAssignment> getRoleMenuAssignments(Long id) {
        adminSupport.requireEntity(roleMapper.selectById(id), "role");
        List<RoleMenuEntity> relations = roleMenuMapper.selectList(new LambdaQueryWrapper<RoleMenuEntity>()
                .eq(RoleMenuEntity::getDeletedFlag, 0)
                .eq(RoleMenuEntity::getRoleId, id));
        if (relations.isEmpty()) {
            return List.of();
        }
        return menuMapper.selectBatchIds(relations.stream().map(RoleMenuEntity::getMenuId).toList()).stream()
                .filter(menu -> menu.getDeletedFlag() == 0)
                .collect(Collectors.toMap(MenuEntity::getId, menu -> menu, (left, right) -> left, LinkedHashMap::new))
                .values().stream()
                .map(this::toRoleMenuAssignment)
                .toList();
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<PermissionSummary> listPermissions(PageQuery query) {
        var wrapper = adminSupport.<PermissionEntity>activeWrapper();
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.like(PermissionEntity::getPermissionCode, query.keyword());
        }
        var page = permissionMapper.selectPage(adminSupport.page(query), wrapper);
        return PageResponse.of(page.getTotal(), query.normalizedPage(), query.normalizedPageSize(),
                page.getRecords().stream().map(this::toPermissionSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public PermissionSummary getPermission(Long id) {
        return toPermissionSummary(adminSupport.requireEntity(permissionMapper.selectById(id), "permission"));
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "PERMISSION", actionCode = "permission.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public PermissionSummary createPermission(PermissionCommand command) {
        PermissionEntity entity = new PermissionEntity();
        rolePermissionAdminMapper.applyPermission(command, entity);
        entity.setStatus(Status.ACTIVE);
        permissionMapper.insert(entity);
        return toPermissionSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "PERMISSION", actionCode = "permission.update", entityId = "#id")
    public PermissionSummary updatePermission(Long id, PermissionCommand command) {
        PermissionEntity entity = adminSupport.requireEntity(permissionMapper.selectById(id), "permission");
        rolePermissionAdminMapper.applyPermission(command, entity);
        permissionMapper.updateById(entity);
        return toPermissionSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "PERMISSION", actionCode = "permission.status", entityId = "#id")
    public void setPermissionStatus(Long id, String status) {
        adminSafetyGuard.requireCanSetPermissionStatus(id, status);
        PermissionEntity entity = adminSupport.requireEntity(permissionMapper.selectById(id), "permission");
        entity.setStatus(status);
        permissionMapper.updateById(entity);
    }

    public RoleSummary toRoleSummary(RoleEntity entity) {
        return rolePermissionAdminMapper.toRoleSummary(entity, adminSupport.resolveRolePermissionCodes(entity));
    }

    public PermissionSummary toPermissionSummary(PermissionEntity entity) {
        return rolePermissionAdminMapper.toPermissionSummary(entity);
    }

    private RoleMenuAssignment toRoleMenuAssignment(MenuEntity entity) {
        return new RoleMenuAssignment(entity.getId(), entity.getMenuCode(), entity.getMenuName(), entity.getPath());
    }

    private void evictCacheByRoleId(Long roleId) {
        var userRoles = userRoleMapper.selectList(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.labelhub.infra.persistence.entity.UserRoleEntity>()
                .eq(com.labelhub.infra.persistence.entity.UserRoleEntity::getDeletedFlag, 0)
                .eq(com.labelhub.infra.persistence.entity.UserRoleEntity::getRoleId, roleId));
        authUserCacheService.evictByUserIds(
                userRoles.stream().map(com.labelhub.infra.persistence.entity.UserRoleEntity::getUserId).distinct().toList());
    }
}
