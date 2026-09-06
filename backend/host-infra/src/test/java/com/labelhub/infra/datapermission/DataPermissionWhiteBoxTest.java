package com.labelhub.infra.datapermission;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScope;
import com.labelhub.core.datapermission.DataScopeType;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.DataScopePolicyEntity;
import com.labelhub.infra.persistence.entity.RoleDataScopeEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.mapper.DataScopePolicyMapper;
import com.labelhub.infra.persistence.mapper.RoleDataScopeMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import java.util.List;
import java.util.Set;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.Signature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — 数据权限")
class DataPermissionWhiteBoxTest {

    @Mock
    private RoleMapper roleMapper;
    @Mock
    private RoleDataScopeMapper roleDataScopeMapper;
    @Mock
    private DataScopePolicyMapper dataScopePolicyMapper;
    @Mock
    private ProceedingJoinPoint joinPoint;
    @Mock
    private Signature signature;

    private DbDataPermissionService dataPermissionService;
    private DataScopeAspect dataScopeAspect;

    @BeforeEach
    void setUp() {
        dataPermissionService = new DbDataPermissionService(roleMapper, roleDataScopeMapper, dataScopePolicyMapper);
        dataScopeAspect = new DataScopeAspect(() -> labelerUser(), dataPermissionService);
    }

    @Test
    @DisplayName("WB-DP-001: DataScopeAspect 在调用链内写入 currentRule")
    void wbDp001_dataScopeAspectSetsThreadLocalRule() throws Throwable {
        stubRoleBindings(2003L, 5001L, taskMemberPolicy(5001L));
        when(joinPoint.proceed()).thenAnswer(invocation -> {
            DataPermissionRule current = DataScopeAspect.currentRule();
            assertThat(current).isNotNull();
            assertThat(current.resourceType()).isEqualTo(DataResourceType.TASK);
            assertThat(current.predicates()).isNotEmpty();
            return "ok";
        });

        Object result = dataScopeAspect.around(joinPoint, taskMemberScope());

        assertThat(result).isEqualTo("ok");
        assertThat(DataScopeAspect.currentRule()).isNull();
    }

    @Test
    @DisplayName("WB-DP-002: scope=TASK_MEMBER 生成成员过滤谓词")
    void wbDp002_taskMemberScopeBuildsMemberPredicate() {
        stubRoleBindings(2003L, 5001L, taskMemberPolicy(5001L));

        DataPermissionRule rule = dataPermissionService.buildRule(Set.of("LABELER"), DataResourceType.TASK, 11001L);

        assertThat(rule.predicates()).hasSize(1);
        assertThat(rule.predicates().get(0).sql()).contains("task_members");
        assertThat(rule.predicates().get(0).params()).containsExactly(11001L);
    }

    @Test
    @DisplayName("WB-DP-004: 多策略叠加时合并多条谓词")
    void wbDp004_multiplePoliciesMergePredicates() {
        RoleEntity role = new RoleEntity();
        role.setId(2003L);
        role.setRoleCode("LABELER");
        role.setDeletedFlag(0);
        role.setStatus(Status.ACTIVE);
        when(roleMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(role));

        RoleDataScopeEntity memberRelation = new RoleDataScopeEntity();
        memberRelation.setRoleId(2003L);
        memberRelation.setPolicyId(5001L);
        memberRelation.setDeletedFlag(0);
        RoleDataScopeEntity allRelation = new RoleDataScopeEntity();
        allRelation.setRoleId(2003L);
        allRelation.setPolicyId(5002L);
        allRelation.setDeletedFlag(0);
        when(roleDataScopeMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(List.of(memberRelation, allRelation));
        when(dataScopePolicyMapper.selectBatchIds(any()))
                .thenReturn(List.of(taskMemberPolicy(5001L), allScopePolicy(5002L)));

        DataPermissionRule rule = dataPermissionService.buildRule(Set.of("LABELER"), DataResourceType.TASK, 11001L);

        assertThat(rule.policies()).hasSize(2);
        assertThat(rule.predicates()).hasSize(2);
        assertThat(rule.predicates().stream().map(SqlPredicate::sql))
                .anyMatch(sql -> sql.contains("task_members"))
                .anyMatch(sql -> sql.equals("1=1"));
    }

    @Test
    @DisplayName("WB-DP-003: scope=ALL 生成无额外 WHERE 谓词")
    void wbDp003_allScopeBuildsUnrestrictedPredicate() {
        stubRoleBindings(2003L, 5002L, allScopePolicy(5002L));

        DataPermissionRule rule = dataPermissionService.buildRule(Set.of("LABELER"), DataResourceType.TASK, 11001L);

        assertThat(rule.predicates()).hasSize(1);
        assertThat(rule.predicates().get(0).sql()).isEqualTo("1=1");
        assertThat(rule.predicates().get(0).params()).isEmpty();
    }

    private void stubRoleBindings(long roleId, long policyId, DataScopePolicyEntity policy) {
        RoleEntity role = new RoleEntity();
        role.setId(roleId);
        role.setRoleCode("LABELER");
        role.setDeletedFlag(0);
        role.setStatus(Status.ACTIVE);
        when(roleMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(role));

        RoleDataScopeEntity relation = new RoleDataScopeEntity();
        relation.setRoleId(roleId);
        relation.setPolicyId(policyId);
        relation.setDeletedFlag(0);
        when(roleDataScopeMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(relation));
        when(dataScopePolicyMapper.selectBatchIds(any())).thenReturn(List.of(policy));
    }

    private static DataScopePolicyEntity taskMemberPolicy(long id) {
        DataScopePolicyEntity entity = new DataScopePolicyEntity();
        entity.setId(id);
        entity.setPolicyCode("TASK_MEMBER");
        entity.setPolicyName("任务成员");
        entity.setResourceType(DataResourceType.TASK.name());
        entity.setScopeType(DataScopeType.TASK_MEMBER.name());
        entity.setStatus(Status.ACTIVE);
        entity.setDeletedFlag(0);
        return entity;
    }

    private static DataScopePolicyEntity allScopePolicy(long id) {
        DataScopePolicyEntity entity = new DataScopePolicyEntity();
        entity.setId(id);
        entity.setPolicyCode("ALL");
        entity.setPolicyName("全部");
        entity.setResourceType(DataResourceType.TASK.name());
        entity.setScopeType(DataScopeType.ALL.name());
        entity.setStatus(Status.ACTIVE);
        entity.setDeletedFlag(0);
        return entity;
    }

    private static AuthenticatedUser labelerUser() {
        return new AuthenticatedUser(
                11001L,
                "labeler_001",
                "Labeler One",
                Set.of("LABELER"),
                Set.of("business:labeler:workbench"),
                List.of(),
                Set.of());
    }

    private static DataScope taskMemberScope() {
        return new DataScope() {
            @Override
            public Class<DataScope> annotationType() {
                return DataScope.class;
            }

            @Override
            public DataResourceType resource() {
                return DataResourceType.TASK;
            }
        };
    }
}
