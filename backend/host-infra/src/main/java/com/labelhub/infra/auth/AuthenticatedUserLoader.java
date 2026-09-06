package com.labelhub.infra.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.datapermission.DbDataPermissionService;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AuthenticatedUserLoader {
    private final UserMapper userMapper;
    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final PermissionMapper permissionMapper;
    private final DbDataPermissionService dataPermissionService;

    public AuthenticatedUserLoader(
            UserMapper userMapper,
            UserRoleMapper userRoleMapper,
            RoleMapper roleMapper,
            RolePermissionMapper rolePermissionMapper,
            PermissionMapper permissionMapper,
            DbDataPermissionService dataPermissionService) {
        this.userMapper = userMapper;
        this.userRoleMapper = userRoleMapper;
        this.roleMapper = roleMapper;
        this.rolePermissionMapper = rolePermissionMapper;
        this.permissionMapper = permissionMapper;
        this.dataPermissionService = dataPermissionService;
    }

    public AuthenticatedUser requireByUserId(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        UserEntity user = userMapper.selectOne(new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getDeletedFlag, 0)
                .eq(UserEntity::getTenantId, 1L)
                .eq(UserEntity::getId, userId));
        if (user == null || !Status.ACTIVE.equals(user.getStatus())) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN, "User not found or inactive: " + userId);
        }
        return fromUserEntity(user);
    }

    public AuthenticatedUser fromUserEntity(UserEntity user) {
        List<UserRoleEntity> userRoles = userRoleMapper.selectList(new LambdaQueryWrapper<UserRoleEntity>()
                .eq(UserRoleEntity::getDeletedFlag, 0)
                .eq(UserRoleEntity::getUserId, user.getId()));
        List<Long> roleIds = userRoles.stream().map(UserRoleEntity::getRoleId).toList();
        if (roleIds.isEmpty()) {
            return new AuthenticatedUser(
                    user.getId(), user.getUsername(), user.getDisplayName(), Set.of(), Set.of(), List.of(), Set.of());
        }

        List<RoleEntity> roles = roleMapper.selectBatchIds(roleIds).stream()
                .filter(role -> role.getDeletedFlag() == 0)
                .toList();
        Set<String> roleCodes = roles.stream()
                .filter(role -> Status.ACTIVE.equals(role.getStatus()))
                .map(RoleEntity::getRoleCode)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<String> roleNames = roles.stream()
                .filter(role -> Status.ACTIVE.equals(role.getStatus()))
                .map(RoleEntity::getRoleName)
                .toList();

        List<RolePermissionEntity> rolePermissions = rolePermissionMapper.selectList(
                new LambdaQueryWrapper<RolePermissionEntity>()
                        .eq(RolePermissionEntity::getDeletedFlag, 0)
                        .in(RolePermissionEntity::getRoleId, roleIds));
        List<Long> permissionIds = rolePermissions.stream()
                .map(RolePermissionEntity::getPermissionId)
                .distinct()
                .toList();
        Set<String> permissions = permissionIds.isEmpty()
                ? Set.of()
                : permissionMapper.selectBatchIds(permissionIds).stream()
                        .filter(permission -> permission.getDeletedFlag() == 0
                                && Status.ACTIVE.equals(permission.getStatus()))
                        .map(PermissionEntity::getPermissionCode)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> dataScopeResources = dataPermissionService.listGrantedResourceTypes(roleCodes).stream()
                .map(DataResourceType::name)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return new AuthenticatedUser(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                roleCodes,
                permissions,
                roleNames,
                dataScopeResources);
    }
}
