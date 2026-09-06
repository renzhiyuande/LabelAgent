package com.labelhub.infra.business.task.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.infra.business.AbstractDbService;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.TaskMemberSummary;
import com.labelhub.core.business.TaskMemberService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.TaskMemberQuerySpec;
import com.labelhub.infra.persistence.entity.TaskMemberEntity;
import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.mapper.TaskMemberMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbTaskMemberService extends AbstractDbService<TaskMemberEntity> implements TaskMemberService {
    private static final ResourceQuerySpec<TaskMemberEntity> QUERY_SPEC = TaskMemberQuerySpec.build();

    private final TaskMemberMapper taskMemberMapper;
    private final UserMapper userMapper;
    private final UserDisplayNameResolver userDisplayNameResolver;
    private final MybatisQueryApplier queryApplier;

    public DbTaskMemberService(TaskMemberMapper taskMemberMapper, UserMapper userMapper,
            UserDisplayNameResolver userDisplayNameResolver, MybatisQueryApplier queryApplier) {
        this.taskMemberMapper = taskMemberMapper;
        this.userMapper = userMapper;
        this.userDisplayNameResolver = userDisplayNameResolver;
        this.queryApplier = queryApplier;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public PageResponse<TaskMemberSummary> listTaskMembers(ParsedListQuery query) {
        return pageQuery(
                wrapper -> taskMemberMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper),
                this::toSummary,
                query.page(),
                query.pageSize(),
                wrapper -> {
                    queryApplier.apply(wrapper, query, QUERY_SPEC);
                    if (query.sort().isEmpty()) {
                        wrapper.orderByDesc(TaskMemberEntity::getJoinedAt);
                    }
                });
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public TaskMemberSummary getTaskMember(Long id) {
        return toSummary(requireNotDeleted(taskMemberMapper.selectById(id), ErrorCode.INVALID_OPERATION));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TASK_MEMBER", actionCode = "taskMember.add", entityId = "#result.id()", after = com.labelhub.core.audit.AuditSnapshotSource.RESULT)
    public TaskMemberSummary addTaskMember(Long taskId, Long userId, String memberRole) {
        UserEntity user = userMapper.selectById(userId);
        if (user == null || user.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "用户不存在");
        }

        LambdaQueryWrapper<TaskMemberEntity> existingWrapper = new LambdaQueryWrapper<>();
        existingWrapper.eq(TaskMemberEntity::getTaskId, taskId)
                .eq(TaskMemberEntity::getUserId, userId)
                .eq(TaskMemberEntity::getDeletedFlag, 0)
                .last("LIMIT 1");
        TaskMemberEntity existing = taskMemberMapper.selectOne(existingWrapper);
        if (existing != null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "该用户已是任务成员");
        }

        TaskMemberEntity e = new TaskMemberEntity();
        e.setTaskId(taskId);
        e.setUserId(userId);
        e.setMemberRole(memberRole != null ? memberRole : "VIEWER");
        e.setPermissionSetJson(permissionSetFor(e.getMemberRole()));
        e.setStatus("ACTIVE");
        e.setJoinedAt(Instant.now());
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        taskMemberMapper.insert(e);
        return toSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TASK_MEMBER", actionCode = "taskMember.remove", entityId = "#id")
    public void removeTaskMember(Long id) {
        TaskMemberEntity e = requireNotDeleted(taskMemberMapper.selectById(id), ErrorCode.INVALID_OPERATION);
        e.setDeletedFlag(1);
        e.setUpdatedAt(Instant.now());
        taskMemberMapper.updateById(e);
    }

    @Override
    public List<String> getUserTaskPermissions(Long userId, Long taskId) {
        LambdaQueryWrapper<TaskMemberEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskMemberEntity::getTaskId, taskId)
                .eq(TaskMemberEntity::getUserId, userId)
                .eq(TaskMemberEntity::getDeletedFlag, 0)
                .eq(TaskMemberEntity::getStatus, "ACTIVE")
                .last("LIMIT 1");
        TaskMemberEntity member = taskMemberMapper.selectOne(wrapper);
        if (member == null) {
            return List.of();
        }
        String json = member.getPermissionSetJson();
        if (json == null || json.isBlank() || "[]".equals(json)) {
            return List.of();
        }
        return Arrays.asList(json.replace("[", "").replace("]", "").replace("\"", "").split(","));
    }

    private String permissionSetFor(String role) {
        return switch (role == null ? "" : role.toUpperCase()) {
            case "OWNER" -> "[\"task:read\",\"task:update\",\"task:delete\",\"task:publish\",\"task:member:manage\"]";
            case "EDITOR" -> "[\"task:read\",\"task:update\"]";
            case "REVIEWER" -> "[\"task:read\",\"review:manage\"]";
            default -> "[\"task:read\"]";
        };
    }

    private TaskMemberSummary toSummary(TaskMemberEntity e) {
        String userName = userDisplayNameResolver.resolve(e.getUserId(), "unknown");
        return new TaskMemberSummary(e.getId(), e.getTaskId(), e.getUserId(), userName, e.getMemberRole());
    }
}
