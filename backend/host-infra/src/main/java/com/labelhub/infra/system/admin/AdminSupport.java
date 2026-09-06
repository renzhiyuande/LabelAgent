package com.labelhub.infra.system.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.infra.persistence.entity.PermissionEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.entity.RolePermissionEntity;
import com.labelhub.infra.persistence.mapper.PermissionMapper;
import com.labelhub.infra.persistence.mapper.RolePermissionMapper;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminSupport {
    private final RolePermissionMapper rolePermissionMapper;
    private final PermissionMapper permissionMapper;

    public AdminSupport(RolePermissionMapper rolePermissionMapper, PermissionMapper permissionMapper) {
        this.rolePermissionMapper = rolePermissionMapper;
        this.permissionMapper = permissionMapper;
    }

    public <T> Page<T> page(PageQuery query) {
        return new Page<>(query.normalizedPage(), query.normalizedPageSize());
    }

    public <T> Page<T> page(int page, int pageSize) {
        int normalizedPage = page <= 0 ? 1 : page;
        int normalizedPageSize = pageSize <= 0 ? 10 : Math.min(pageSize, 100);
        return new Page<>(normalizedPage, normalizedPageSize);
    }

    public <T> T requireEntity(T entity, String name) {
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, name + " not found");
        }
        return entity;
    }

    public int nullSafe(Integer value) {
        return value == null ? 0 : value;
    }

    public <T> LambdaQueryWrapper<T> activeWrapper() {
        return new LambdaQueryWrapper<T>().apply("deleted_flag = 0");
    }

    /**
     * 查询角色关联的所有权限代码（去重、保持排序）。
     * <p>提取自 {@code UserAdminService} 和 {@code RolePermissionAdminService} 中的重复实现。</p>
     */
    public Set<String> resolveRolePermissionCodes(RoleEntity entity) {
        List<RolePermissionEntity> rolePermissions = rolePermissionMapper.selectList(
                new LambdaQueryWrapper<RolePermissionEntity>()
                        .eq(RolePermissionEntity::getDeletedFlag, 0)
                        .eq(RolePermissionEntity::getRoleId, entity.getId()));
        if (rolePermissions.isEmpty()) {
            return Set.of();
        }
        return permissionMapper.selectBatchIds(
                rolePermissions.stream().map(RolePermissionEntity::getPermissionId).toList()
        ).stream()
                .filter(p -> p.getDeletedFlag() == 0)
                .map(PermissionEntity::getPermissionCode)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
