package com.labelhub.infra.system.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScopeType;
import com.labelhub.core.system.SystemDtos.AssignDataScopesCommand;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.DataScopePolicyEntity;
import com.labelhub.infra.persistence.entity.RoleDataScopeEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.mapper.DataScopePolicyMapper;
import com.labelhub.infra.persistence.mapper.PermissionMapper;
import com.labelhub.infra.persistence.mapper.RoleDataScopeMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import com.labelhub.infra.persistence.mapper.RolePermissionMapper;
import com.labelhub.infra.system.admin.mapper.DataScopeAdminMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — DataScopeAdminService")
class DataScopeAdminServiceWhiteBoxTest {

    @Mock
    private DataScopePolicyMapper dataScopePolicyMapper;
    @Mock
    private RoleDataScopeMapper roleDataScopeMapper;
    @Mock
    private RoleMapper roleMapper;
    @Mock
    private DataScopeAdminMapper dataScopeAdminMapper;
    @Mock
    private RolePermissionMapper rolePermissionMapper;
    @Mock
    private PermissionMapper permissionMapper;

    private DataScopeAdminService service;

    @BeforeEach
    void setUp() {
        service = new DataScopeAdminService(
                dataScopePolicyMapper,
                roleDataScopeMapper,
                roleMapper,
                new AdminSupport(rolePermissionMapper, permissionMapper),
                dataScopeAdminMapper);
    }

    @Test
    @DisplayName("WB-DP-005: assignRolePolicies 在已有 2 策略时追加第 3 条")
    void wbDp005_assignRolePoliciesAppendsThirdPolicy() {
        RoleEntity role = new RoleEntity();
        role.setId(2003L);
        role.setRoleCode("LABELER");
        role.setDeletedFlag(0);
        when(roleMapper.selectById(2003L)).thenReturn(role);

        RoleDataScopeEntity relation1 = activeRelation(2003L, 5001L);
        RoleDataScopeEntity relation2 = activeRelation(2003L, 5002L);
        when(roleDataScopeMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(new ArrayList<>(List.of(relation1, relation2)));

        when(dataScopePolicyMapper.selectById(5001L)).thenReturn(policy(5001L));
        when(dataScopePolicyMapper.selectById(5002L)).thenReturn(policy(5002L));
        when(dataScopePolicyMapper.selectById(5003L)).thenReturn(policy(5003L));

        service.assignRolePolicies(2003L, new AssignDataScopesCommand(List.of(5001L, 5002L, 5003L)));

        ArgumentCaptor<RoleDataScopeEntity> insertCaptor = ArgumentCaptor.forClass(RoleDataScopeEntity.class);
        verify(roleDataScopeMapper).insert(insertCaptor.capture());
        assertThat(insertCaptor.getValue().getRoleId()).isEqualTo(2003L);
        assertThat(insertCaptor.getValue().getPolicyId()).isEqualTo(5003L);
    }

    private static RoleDataScopeEntity activeRelation(long roleId, long policyId) {
        RoleDataScopeEntity entity = new RoleDataScopeEntity();
        entity.setId(roleId * 10 + policyId);
        entity.setRoleId(roleId);
        entity.setPolicyId(policyId);
        entity.setDeletedFlag(0);
        return entity;
    }

    private static DataScopePolicyEntity policy(long id) {
        DataScopePolicyEntity entity = new DataScopePolicyEntity();
        entity.setId(id);
        entity.setPolicyCode("POLICY_" + id);
        entity.setPolicyName("Policy " + id);
        entity.setResourceType(DataResourceType.TASK.name());
        entity.setScopeType(DataScopeType.TASK_MEMBER.name());
        entity.setStatus(Status.ACTIVE);
        entity.setDeletedFlag(0);
        return entity;
    }
}
