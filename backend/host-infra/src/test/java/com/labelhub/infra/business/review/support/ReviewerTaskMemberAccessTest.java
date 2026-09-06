package com.labelhub.infra.business.review.support;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.labelhub.core.datapermission.DataPermissionService;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScopePolicy;
import com.labelhub.core.datapermission.DataScopeType;
import com.labelhub.core.error.BusinessException;
import com.labelhub.infra.persistence.entity.TaskMemberEntity;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TaskMemberMapper;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ReviewerTaskMemberAccessTest {

    @Mock
    private DataPermissionService dataPermissionService;

    @Mock
    private TaskMemberMapper taskMemberMapper;

    @Mock
    private TaskMapper taskMapper;

    @Mock
    private ReviewRecordMapper reviewRecordMapper;

    private ReviewerTaskMemberAccess access;

    @BeforeEach
    void setUp() {
        access = new ReviewerTaskMemberAccess(
                dataPermissionService, taskMemberMapper, taskMapper, reviewRecordMapper);
    }

    @Test
    void requireTaskAccess_allowsActiveReviewerMember() {
        when(dataPermissionService.listPolicies(Set.of("REVIEWER"), DataResourceType.REVIEW))
                .thenReturn(List.of(taskMemberPolicy()));
        TaskMemberEntity member = new TaskMemberEntity();
        member.setTaskId(100L);
        when(taskMemberMapper.selectOne(any())).thenReturn(member);

        assertDoesNotThrow(() -> access.requireTaskAccess(100L, 9L, Set.of("REVIEWER"), Set.of()));
    }

    @Test
    void requireTaskAccess_usesTaskMemberDefaultWhenWorkbenchGrantedWithoutPolicies() {
        when(dataPermissionService.listPolicies(Set.of("SEED_REVIEWER_L1"), DataResourceType.REVIEW))
                .thenReturn(List.of());
        TaskMemberEntity member = new TaskMemberEntity();
        member.setTaskId(100L);
        when(taskMemberMapper.selectOne(any())).thenReturn(member);

        assertDoesNotThrow(() -> access.requireTaskAccess(
                100L, 9L, Set.of("SEED_REVIEWER_L1"), Set.of("business:reviewer:workbench")));
    }

    @Test
    void requireTaskAccess_deniesWhenWorkbenchGrantedButNotTaskMember() {
        when(dataPermissionService.listPolicies(Set.of("SEED_REVIEWER_L1"), DataResourceType.REVIEW))
                .thenReturn(List.of());
        when(taskMemberMapper.selectOne(any())).thenReturn(null);

        assertThrows(
                BusinessException.class,
                () -> access.requireTaskAccess(
                        100L, 9L, Set.of("SEED_REVIEWER_L1"), Set.of("business:reviewer:workbench")));
    }

    @Test
    void requireTaskAccess_deniesWhenNotMember() {
        when(dataPermissionService.listPolicies(Set.of("REVIEWER"), DataResourceType.REVIEW))
                .thenReturn(List.of(taskMemberPolicy()));
        when(taskMemberMapper.selectOne(any())).thenReturn(null);

        assertThrows(
                BusinessException.class,
                () -> access.requireTaskAccess(100L, 9L, Set.of("REVIEWER"), Set.of("business:reviewer:workbench")));
    }

    @Test
    void requireTaskAccess_systemAdminBypass() {
        assertDoesNotThrow(() -> access.requireTaskAccess(100L, 9L, Set.of(), Set.of("system:admin")));
    }

    private static DataScopePolicy taskMemberPolicy() {
        return new DataScopePolicy(
                9108L, "review.task_member", "Task Member Reviews", DataResourceType.REVIEW, DataScopeType.TASK_MEMBER,
                null, "ACTIVE", null);
    }
}
