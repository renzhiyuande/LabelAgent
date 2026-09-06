package com.labelhub.infra.audit;

import com.labelhub.core.audit.AuditEntitySnapshotProvider;
import com.labelhub.infra.persistence.mapper.DataScopePolicyMapper;
import com.labelhub.infra.persistence.mapper.DictItemMapper;
import com.labelhub.infra.persistence.mapper.DictTypeMapper;
import com.labelhub.infra.persistence.mapper.MenuMapper;
import com.labelhub.infra.persistence.mapper.PermissionMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SystemClientMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import java.util.Map;
import java.util.function.BiFunction;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminEntitySnapshotProvider implements AuditEntitySnapshotProvider {
    private final Map<String, BiFunction<String, Long, Object>> loaders;

    public AdminEntitySnapshotProvider(
            UserMapper userMapper,
            RoleMapper roleMapper,
            PermissionMapper permissionMapper,
            MenuMapper menuMapper,
            DictTypeMapper dictTypeMapper,
            DictItemMapper dictItemMapper,
            AssignmentMapper assignmentMapper,
            SystemClientMapper systemClientMapper,
            DataScopePolicyMapper dataScopePolicyMapper) {
        this.loaders = Map.of(
                "USER", (ignored, id) -> userMapper.selectById(id),
                "ROLE", (ignored, id) -> roleMapper.selectById(id),
                "PERMISSION", (ignored, id) -> permissionMapper.selectById(id),
                "MENU", (ignored, id) -> menuMapper.selectById(id),
                "DICT_TYPE", (ignored, id) -> dictTypeMapper.selectById(id),
                "DICT_ITEM", (ignored, id) -> dictItemMapper.selectById(id),
                "ASSIGNMENT", (ignored, id) -> assignmentMapper.selectById(id),
                "SYSTEM_CLIENT", (ignored, id) -> systemClientMapper.selectById(id),
                "DATA_SCOPE_POLICY", (ignored, id) -> dataScopePolicyMapper.selectById(id));
    }

    @Override
    public Object load(String entityType, Long entityId) {
        if (entityId == null) {
            return null;
        }
        BiFunction<String, Long, Object> loader = loaders.get(entityType);
        return loader == null ? null : loader.apply(entityType, entityId);
    }
}
