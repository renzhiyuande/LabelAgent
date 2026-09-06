package com.labelhub.infra.system.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.system.SystemDtos.AssignRolesCommand;
import com.labelhub.core.system.SystemDtos.BatchAssignRolesCommand;
import com.labelhub.core.system.SystemDtos.BatchAssignRolesFailure;
import com.labelhub.core.system.SystemDtos.BatchAssignRolesResult;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.system.SystemDtos.RoleSummary;
import com.labelhub.core.system.SystemDtos.UserCommand;
import com.labelhub.core.system.SystemDtos.UserSummary;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.PermissionEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.entity.RolePermissionEntity;
import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.entity.UserRoleEntity;
import com.labelhub.infra.persistence.mapper.PermissionMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import com.labelhub.infra.persistence.mapper.RolePermissionMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.persistence.mapper.UserRoleMapper;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.UserQuerySpec;
import com.labelhub.infra.system.admin.mapper.UserAdminMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class UserAdminService {
    private static final ResourceQuerySpec<UserEntity> QUERY_SPEC = UserQuerySpec.build();

    private final UserMapper userMapper;
    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final PermissionMapper permissionMapper;
    private final AdminSupport adminSupport;
    private final MybatisQueryApplier queryApplier;
    private final BCryptPasswordEncoder passwordEncoder;
    private final UserAdminMapper userAdminMapper;
    private final AdminSafetyGuard adminSafetyGuard;
    private final com.labelhub.infra.auth.AuthUserCacheService authUserCacheService;

    public UserAdminService(
            UserMapper userMapper,
            UserRoleMapper userRoleMapper,
            RoleMapper roleMapper,
            RolePermissionMapper rolePermissionMapper,
            PermissionMapper permissionMapper,
            AdminSupport adminSupport,
            MybatisQueryApplier queryApplier,
            BCryptPasswordEncoder passwordEncoder,
            UserAdminMapper userAdminMapper,
            AdminSafetyGuard adminSafetyGuard,
            com.labelhub.infra.auth.AuthUserCacheService authUserCacheService) {
        this.userMapper = userMapper;
        this.userRoleMapper = userRoleMapper;
        this.roleMapper = roleMapper;
        this.rolePermissionMapper = rolePermissionMapper;
        this.permissionMapper = permissionMapper;
        this.adminSupport = adminSupport;
        this.queryApplier = queryApplier;
        this.passwordEncoder = passwordEncoder;
        this.userAdminMapper = userAdminMapper;
        this.adminSafetyGuard = adminSafetyGuard;
        this.authUserCacheService = authUserCacheService;
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<UserSummary> listUsers(PageQuery query) {
        var wrapper = adminSupport.<UserEntity>activeWrapper();
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.like(UserEntity::getUsername, query.keyword());
        }
        var page = userMapper.selectPage(adminSupport.page(query), wrapper);
        List<UserEntity> records = page.getRecords();
        Map<Long, List<RoleSummary>> roleMap = roleMapForUsers(records.stream().map(UserEntity::getId).toList());
        return PageResponse.of(page.getTotal(), query.normalizedPage(), query.normalizedPageSize(),
                records.stream().map(user -> toUserSummary(user, roleMap.getOrDefault(user.getId(), List.of()))).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<UserSummary> listUsers(ParsedListQuery query) {
        var wrapper = adminSupport.<UserEntity>activeWrapper();
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.and(item -> item.like(UserEntity::getUsername, query.keyword()).or()
                    .like(UserEntity::getDisplayName, query.keyword()));
        }
        queryApplier.apply(wrapper, query, QUERY_SPEC);
        var page = userMapper.selectPage(adminSupport.page(query.page(), query.pageSize()), wrapper);
        List<UserEntity> records = page.getRecords();
        Map<Long, List<RoleSummary>> roleMap = roleMapForUsers(records.stream().map(UserEntity::getId).toList());
        return PageResponse.of(page.getTotal(), query.page(), query.pageSize(),
                records.stream().map(user -> toUserSummary(user, roleMap.getOrDefault(user.getId(), List.of()))).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public UserSummary getUser(Long id) {
        UserEntity user = adminSupport.requireEntity(userMapper.selectById(id), "user");
        return toUserSummary(user, roleMapForUsers(List.of(id)).getOrDefault(id, List.of()));
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "USER", actionCode = "user.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    @org.springframework.cache.annotation.CacheEvict(value = "options", allEntries = true)
    public UserSummary createUser(UserCommand command) {
        UserEntity user = new UserEntity();
        userAdminMapper.applyForCreate(command, user);
        if (command.password() == null || command.password().isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "密码不能为空");
        }
        user.setPasswordHash(passwordEncoder.encode(command.password()));
        user.setStatus(Status.ACTIVE);
        user.setRegisterSource("WEB");
        userMapper.insert(user);
        assignRolesInternal(user.getId(), command.roleIds() == null ? List.of() : command.roleIds());
        return getUser(user.getId());
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "USER", actionCode = "user.update", entityId = "#id")
    @Caching(evict = {
            @CacheEvict(value = "options", allEntries = true),
            @CacheEvict(value = "userDisplayNames", key = "#id"),
    })
    public UserSummary updateUser(Long id, UserCommand command) {
        UserEntity user = adminSupport.requireEntity(userMapper.selectById(id), "user");
        userAdminMapper.applyForUpdate(command, user);
        if (command.password() != null && !command.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(command.password()));
        }
        userMapper.updateById(user);
        if (command.roleIds() != null) {
            assignRolesInternal(id, command.roleIds());
        }
        authUserCacheService.evictByUserId(id);
        return getUser(id);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "USER", actionCode = "user.status", entityId = "#id")
    public void setUserStatus(Long id, String status) {
        adminSafetyGuard.requireCanChangeUserStatus(id, status);
        UserEntity user = adminSupport.requireEntity(userMapper.selectById(id), "user");
        user.setStatus(status);
        userMapper.updateById(user);
        authUserCacheService.evictByUserId(id);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "USER", actionCode = "user.assignRoles", entityId = "#id",
            before = AuditSnapshotSource.EXPRESSION, beforeExpression = "#target.getUser(#id)",
            after = AuditSnapshotSource.EXPRESSION, afterExpression = "#target.getUser(#id)")
    public void assignUserRoles(Long id, AssignRolesCommand command) {
        adminSupport.requireEntity(userMapper.selectById(id), "user");
        assignRolesInternal(id, command.roleIds());
        authUserCacheService.evictByUserId(id);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "USER", actionCode = "user.batchAssignRoles", entityId = "#command.userIds().get(0)")
    public BatchAssignRolesResult batchAssignUserRoles(BatchAssignRolesCommand command) {
        List<Long> userIds = command.userIds().stream().distinct().toList();
        List<Long> roleIds = command.roleIds().stream().distinct().toList();
        List<BatchAssignRolesFailure> failures = new ArrayList<>();
        int successCount = 0;
        for (Long userId : userIds) {
            try {
                adminSupport.requireEntity(userMapper.selectById(userId), "user");
                assignRolesInternal(userId, roleIds);
                authUserCacheService.evictByUserId(userId);
                successCount++;
            } catch (BusinessException ex) {
                failures.add(new BatchAssignRolesFailure(userId, ex.getMessage()));
            }
        }
        if (successCount == 0 && !failures.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, failures.getFirst().message());
        }
        return new BatchAssignRolesResult(successCount, failures.size(), failures);
    }

    public RoleSummary toRoleSummary(RoleEntity entity) {
        return userAdminMapper.toRoleSummary(entity, adminSupport.resolveRolePermissionCodes(entity));
    }

    private Map<Long, List<RoleSummary>> roleMapForUsers(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        List<UserRoleEntity> userRoles = userRoleMapper.selectList(new LambdaQueryWrapper<UserRoleEntity>()
                .eq(UserRoleEntity::getDeletedFlag, 0)
                .in(UserRoleEntity::getUserId, userIds));
        Set<Long> roleIds = userRoles.stream().map(UserRoleEntity::getRoleId).collect(Collectors.toSet());
        Map<Long, RoleSummary> roles = roleMapper.selectBatchIds(roleIds).stream()
                .filter(role -> role.getDeletedFlag() == 0)
                .map(this::toRoleSummary)
                .collect(Collectors.toMap(RoleSummary::id, Function.identity()));
        Map<Long, List<RoleSummary>> result = new LinkedHashMap<>();
        for (UserRoleEntity userRole : userRoles) {
            RoleSummary role = roles.get(userRole.getRoleId());
            if (role != null) {
                result.computeIfAbsent(userRole.getUserId(), ignored -> new ArrayList<>()).add(role);
            }
        }
        return result;
    }

    private void assignRolesInternal(Long userId, List<Long> roleIds) {
        adminSafetyGuard.requireCanAssignUserRoles(userId, roleIds);
        List<UserRoleEntity> existing = userRoleMapper.selectList(new LambdaQueryWrapper<UserRoleEntity>()
                .eq(UserRoleEntity::getUserId, userId));
        List<Long> targetRoleIds = roleIds.stream().map(Long::valueOf).distinct().toList();
        RelationAssignmentSync.sync(
                existing,
                targetRoleIds,
                UserRoleEntity::getRoleId,
                (entity, roleId) -> {
                    entity.setUserId(userId);
                    entity.setRoleId(roleId);
                },
                UserRoleEntity::new,
                userRoleMapper::insert,
                userRoleMapper::updateById,
                entity -> userRoleMapper.deleteById(entity.getId()));
    }

    private UserSummary toUserSummary(UserEntity entity, List<RoleSummary> roles) {
        return userAdminMapper.toSummary(entity, roles);
    }
}
