package com.labelhub.infra.system.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.PermissionEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.entity.UserRoleEntity;
import com.labelhub.infra.persistence.mapper.PermissionMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.persistence.mapper.UserRoleMapper;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminSafetyGuard {
    public static final String ADMIN_ROLE_CODE = "ADMIN";
    public static final String SYSTEM_ADMIN_PERMISSION_CODE = "system:admin";

    private final CurrentUserProvider currentUserProvider;
    private final UserMapper userMapper;
    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;
    private final PermissionMapper permissionMapper;

    public AdminSafetyGuard(
            CurrentUserProvider currentUserProvider,
            UserMapper userMapper,
            UserRoleMapper userRoleMapper,
            RoleMapper roleMapper,
            PermissionMapper permissionMapper) {
        this.currentUserProvider = currentUserProvider;
        this.userMapper = userMapper;
        this.userRoleMapper = userRoleMapper;
        this.roleMapper = roleMapper;
        this.permissionMapper = permissionMapper;
    }

    public void requireCanChangeUserStatus(Long userId, String status) {
        if (!Status.DISABLED.equals(status)) {
            return;
        }
        Long currentUserId = currentUserProvider.currentUser().userId();
        if (Objects.equals(userId, currentUserId)) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Cannot disable the current user");
        }
        if (isActiveAdminUser(userId) && countActiveAdminUsers() <= 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Cannot disable the last active administrator");
        }
    }

    public void requireCanAssignUserRoles(Long userId, List<Long> roleIds) {
        Long adminRoleId = requireAdminRoleId();
        Long currentUserId = currentUserProvider.currentUser().userId();
        Set<Long> targetRoleIds = roleIds == null
                ? Set.of()
                : roleIds.stream().filter(Objects::nonNull).collect(Collectors.toCollection(HashSet::new));

        if (Objects.equals(userId, currentUserId) && !targetRoleIds.contains(adminRoleId)) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Cannot remove the ADMIN role from the current user");
        }
        if (isActiveAdminUser(userId) && !targetRoleIds.contains(adminRoleId) && countActiveAdminUsers() <= 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Cannot remove the ADMIN role from the last active administrator");
        }
    }

    public void requireCanSetRoleStatus(Long roleId, String status) {
        if (!Status.DISABLED.equals(status)) {
            return;
        }
        RoleEntity role = roleMapper.selectById(roleId);
        if (role != null && role.getDeletedFlag() == 0 && ADMIN_ROLE_CODE.equals(role.getRoleCode())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Cannot disable the ADMIN role");
        }
    }

    public void requireCanAssignRolePermissions(Long roleId, List<Long> permissionIds) {
        RoleEntity role = roleMapper.selectById(roleId);
        if (role == null || role.getDeletedFlag() != 0 || !ADMIN_ROLE_CODE.equals(role.getRoleCode())) {
            return;
        }
        Long systemAdminPermissionId = requireSystemAdminPermissionId();
        Set<Long> targetPermissionIds = permissionIds == null
                ? Set.of()
                : permissionIds.stream().filter(Objects::nonNull).collect(Collectors.toCollection(HashSet::new));
        if (!targetPermissionIds.contains(systemAdminPermissionId)) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "ADMIN role must retain system:admin permission");
        }
    }

    public void requireCanSetPermissionStatus(Long permissionId, String status) {
        if (!Status.DISABLED.equals(status)) {
            return;
        }
        PermissionEntity permission = permissionMapper.selectById(permissionId);
        if (permission != null
                && permission.getDeletedFlag() == 0
                && SYSTEM_ADMIN_PERMISSION_CODE.equals(permission.getPermissionCode())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Cannot disable system:admin permission");
        }
    }

    private boolean isActiveAdminUser(Long userId) {
        UserEntity user = userMapper.selectById(userId);
        if (user == null || user.getDeletedFlag() != 0 || !Status.ACTIVE.equals(user.getStatus())) {
            return false;
        }
        Long adminRoleId = findAdminRoleId();
        if (adminRoleId == null) {
            return false;
        }
        return userRoleMapper.selectCount(new LambdaQueryWrapper<UserRoleEntity>()
                .eq(UserRoleEntity::getDeletedFlag, 0)
                .eq(UserRoleEntity::getUserId, userId)
                .eq(UserRoleEntity::getRoleId, adminRoleId)) > 0;
    }

    private long countActiveAdminUsers() {
        Long adminRoleId = findAdminRoleId();
        if (adminRoleId == null) {
            return 0;
        }
        List<UserRoleEntity> assignments = userRoleMapper.selectList(new LambdaQueryWrapper<UserRoleEntity>()
                .eq(UserRoleEntity::getDeletedFlag, 0)
                .eq(UserRoleEntity::getRoleId, adminRoleId));
        if (assignments.isEmpty()) {
            return 0;
        }
        Set<Long> userIds = assignments.stream().map(UserRoleEntity::getUserId).collect(Collectors.toSet());
        return userMapper.selectBatchIds(userIds).stream()
                .filter(user -> user.getDeletedFlag() == 0 && Status.ACTIVE.equals(user.getStatus()))
                .count();
    }

    private Long requireAdminRoleId() {
        Long adminRoleId = findAdminRoleId();
        if (adminRoleId == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "ADMIN role is missing");
        }
        return adminRoleId;
    }

    private Long findAdminRoleId() {
        RoleEntity adminRole = roleMapper.selectOne(new LambdaQueryWrapper<RoleEntity>()
                .eq(RoleEntity::getDeletedFlag, 0)
                .eq(RoleEntity::getRoleCode, ADMIN_ROLE_CODE)
                .eq(RoleEntity::getStatus, Status.ACTIVE));
        return adminRole == null ? null : adminRole.getId();
    }

    private Long requireSystemAdminPermissionId() {
        PermissionEntity permission = permissionMapper.selectOne(new LambdaQueryWrapper<PermissionEntity>()
                .eq(PermissionEntity::getDeletedFlag, 0)
                .eq(PermissionEntity::getPermissionCode, SYSTEM_ADMIN_PERMISSION_CODE));
        if (permission == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "system:admin permission is missing");
        }
        return permission.getId();
    }
}
