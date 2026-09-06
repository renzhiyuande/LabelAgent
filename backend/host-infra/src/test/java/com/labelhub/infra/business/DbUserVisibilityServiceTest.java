package com.labelhub.infra.business;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.core.business.BusinessDtos.CollaboratorProfile;
import com.labelhub.core.business.CollaboratorRole;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.business.visibility.service.DbUserVisibilityService;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
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
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class DbUserVisibilityServiceTest {

    @Test
    void findVisibleCollaborator_allowsSelfWithoutCollaborationGraph() {
        UserEntity self = activeUser(5L, "owner5", "Owner Five");
        UserMapper userMapper = proxy(UserMapper.class, (proxy, method, args) -> {
            if ("selectById".equals(method.getName())) {
                return self;
            }
            return null;
        });
        UserRoleMapper userRoleMapper = proxy(UserRoleMapper.class, (proxy, method, args) -> List.of());

        DbUserVisibilityService service = new DbUserVisibilityService(
                userMapper,
                userRoleMapper,
                proxy(RoleMapper.class, (p, m, a) -> null),
                proxy(AssignmentMapper.class, (p, m, a) -> null),
                proxy(ReviewRecordMapper.class, (p, m, a) -> null),
                proxy(TaskMapper.class, (p, m, a) -> null),
                proxy(TaskMemberMapper.class, (p, m, a) -> null));

        Optional<CollaboratorProfile> profile = service.findVisibleCollaborator(
                5L, Set.of("OWNER"), 5L, CollaboratorRole.LABELER);

        assertThat(profile).isPresent();
        assertThat(profile.get().displayName()).isEqualTo("Owner Five");
    }

    @Test
    void findVisibleCollaborator_rejectsUserOutsideVisibleSet() {
        UserMapper userMapper = proxy(UserMapper.class, (proxy, method, args) -> null);
        UserRoleMapper userRoleMapper = proxy(UserRoleMapper.class, (proxy, method, args) -> List.of());
        AssignmentMapper assignmentMapper = proxy(AssignmentMapper.class, (proxy, method, args) -> {
            if ("selectList".equals(method.getName())) {
                return List.of();
            }
            return null;
        });
        ReviewRecordMapper reviewRecordMapper = proxy(ReviewRecordMapper.class, (proxy, method, args) -> {
            if ("selectList".equals(method.getName())) {
                return List.of();
            }
            return null;
        });

        DbUserVisibilityService service = new DbUserVisibilityService(
                userMapper,
                userRoleMapper,
                proxy(RoleMapper.class, (p, m, a) -> null),
                assignmentMapper,
                reviewRecordMapper,
                proxy(TaskMapper.class, (p, m, a) -> null),
                proxy(TaskMemberMapper.class, (p, m, a) -> null));

        Optional<CollaboratorProfile> profile = service.findVisibleCollaborator(
                5L, Set.of("LABELER"), 99L, null);

        assertThat(profile).isEmpty();
    }

    @Test
    void findVisibleCollaborator_allowsOwnerToSeeTaskReviewerWithoutStandardReviewerRole() {
        long ownerId = 910100000001L;
        long reviewerId = 910100000201L;
        long taskId = 910230000001L;
        UserEntity reviewer = activeUser(reviewerId, "seed_reviewer_lin", "审核员 Lin");

        UserMapper userMapper = proxy(UserMapper.class, (proxy, method, args) -> {
            if ("selectById".equals(method.getName())
                    && args != null
                    && args.length > 0
                    && reviewerId == ((Number) args[0]).longValue()) {
                return reviewer;
            }
            return null;
        });
        UserRoleMapper userRoleMapper = proxy(UserRoleMapper.class, (proxy, method, args) -> List.of());
        RoleMapper roleMapper = proxy(RoleMapper.class, (proxy, method, args) -> List.of());
        TaskMapper taskMapper = proxy(TaskMapper.class, (proxy, method, args) -> {
            if ("selectList".equals(method.getName())) {
                TaskEntity task = new TaskEntity();
                task.setId(taskId);
                task.setOwnerId(ownerId);
                task.setDeletedFlag(0);
                return List.of(task);
            }
            return null;
        });
        TaskMemberMapper taskMemberMapper = proxy(TaskMemberMapper.class, (proxy, method, args) -> {
            if ("selectList".equals(method.getName())) {
                TaskMemberEntity member = new TaskMemberEntity();
                member.setTaskId(taskId);
                member.setUserId(reviewerId);
                member.setMemberRole("REVIEWER");
                member.setDeletedFlag(0);
                return List.of(member);
            }
            return null;
        });
        AssignmentMapper assignmentMapper = proxy(AssignmentMapper.class, (proxy, method, args) -> List.of());
        ReviewRecordMapper reviewRecordMapper = proxy(ReviewRecordMapper.class, (proxy, method, args) -> {
            if ("selectList".equals(method.getName())) {
                ReviewRecordEntity record = new ReviewRecordEntity();
                record.setTaskId(taskId);
                record.setReviewerId(reviewerId);
                record.setDeletedFlag(0);
                return List.of(record);
            }
            return null;
        });

        DbUserVisibilityService service = new DbUserVisibilityService(
                userMapper,
                userRoleMapper,
                roleMapper,
                assignmentMapper,
                reviewRecordMapper,
                taskMapper,
                taskMemberMapper);

        Optional<CollaboratorProfile> profile = service.findVisibleCollaborator(
                ownerId, Set.of("OWNER"), reviewerId, CollaboratorRole.REVIEWER);

        assertThat(profile).isPresent();
        assertThat(profile.get().displayName()).isEqualTo("审核员 Lin");
    }

    @Test
    void findVisibleCollaborator_allowsAdminToSeeTaskReviewerWithoutStandardReviewerRole() {
        long adminId = 1001L;
        long reviewerId = 910100000201L;
        long taskId = 910230000001L;
        UserEntity reviewer = activeUser(reviewerId, "seed_reviewer_lin", "审核员 Lin");

        UserMapper userMapper = proxy(UserMapper.class, (proxy, method, args) -> {
            if ("selectById".equals(method.getName())
                    && args != null
                    && args.length > 0
                    && reviewerId == ((Number) args[0]).longValue()) {
                return reviewer;
            }
            return null;
        });
        UserRoleMapper userRoleMapper = proxy(UserRoleMapper.class, (proxy, method, args) -> List.of());
        RoleMapper roleMapper = proxy(RoleMapper.class, (proxy, method, args) -> List.of());
        TaskMapper taskMapper = proxy(TaskMapper.class, (proxy, method, args) -> List.of());
        TaskMemberMapper taskMemberMapper = proxy(TaskMemberMapper.class, (proxy, method, args) -> {
            if ("selectList".equals(method.getName())) {
                TaskMemberEntity member = new TaskMemberEntity();
                member.setTaskId(taskId);
                member.setUserId(reviewerId);
                member.setMemberRole("REVIEWER");
                member.setDeletedFlag(0);
                return List.of(member);
            }
            return null;
        });
        AssignmentMapper assignmentMapper = proxy(AssignmentMapper.class, (proxy, method, args) -> List.of());
        ReviewRecordMapper reviewRecordMapper = proxy(ReviewRecordMapper.class, (proxy, method, args) -> List.of());

        DbUserVisibilityService service = new DbUserVisibilityService(
                userMapper,
                userRoleMapper,
                roleMapper,
                assignmentMapper,
                reviewRecordMapper,
                taskMapper,
                taskMemberMapper);

        Optional<CollaboratorProfile> profile = service.findVisibleCollaborator(
                adminId, Set.of("ADMIN"), reviewerId, CollaboratorRole.REVIEWER);

        assertThat(profile).isPresent();
        assertThat(profile.get().displayName()).isEqualTo("审核员 Lin");
    }

    private static UserEntity activeUser(Long id, String username, String displayName) {
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setDeletedFlag(0);
        user.setStatus(Status.ACTIVE);
        user.setUsername(username);
        user.setDisplayName(displayName);
        return user;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] { type }, handler);
    }
}
