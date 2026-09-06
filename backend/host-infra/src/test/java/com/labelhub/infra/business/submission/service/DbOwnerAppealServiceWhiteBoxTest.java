package com.labelhub.infra.business.submission.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.business.submission.assembler.SubmissionAppealAssembler;
import com.labelhub.infra.business.submission.workflow.SubmissionAppealLifecycle;
import com.labelhub.infra.datapermission.DataPermissionRule;
import com.labelhub.infra.datapermission.DataScopeAspect;
import com.labelhub.infra.datapermission.DbDataPermissionService;
import com.labelhub.infra.datapermission.SqlPredicate;
import com.labelhub.infra.persistence.entity.SubmissionAppealEntity;
import com.labelhub.infra.persistence.mapper.AppealBatchOperationMapper;
import com.labelhub.infra.persistence.mapper.SubmissionAppealMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.system.CurrentUserContext;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — DbOwnerAppealService 数据权限")
class DbOwnerAppealServiceWhiteBoxTest {

    @Mock
    private SubmissionAppealMapper submissionAppealMapper;
    @Mock
    private AppealBatchOperationMapper appealBatchOperationMapper;
    @Mock
    private TaskMapper taskMapper;
    @Mock
    private SubmissionAppealLifecycle submissionAppealLifecycle;
    @Mock
    private SubmissionAppealAssembler submissionAppealAssembler;
    @Mock
    private DbDataPermissionService dataPermissionService;

    private DbOwnerAppealService service;
    private ThreadLocal<DataPermissionRule> ruleContext;

    @BeforeEach
    void setUp() throws Exception {
        CurrentUserContext currentUserContext = new CurrentUserContext(DbOwnerAppealServiceWhiteBoxTest::labelerUser);
        service = new DbOwnerAppealService(
                submissionAppealMapper,
                appealBatchOperationMapper,
                taskMapper,
                submissionAppealLifecycle,
                submissionAppealAssembler,
                currentUserContext,
                () -> labelerUser(),
                dataPermissionService);

        Field contextField = DataScopeAspect.class.getDeclaredField("CONTEXT");
        contextField.setAccessible(true);
        @SuppressWarnings("unchecked")
        ThreadLocal<DataPermissionRule> context = (ThreadLocal<DataPermissionRule>) contextField.get(null);
        ruleContext = context;
    }

    @AfterEach
    void clearRuleContext() {
        if (ruleContext != null) {
            ruleContext.remove();
        }
    }

    @Test
    @DisplayName("WB-DP-006: 无 DataScope 规则时 listAppeals 按 ownerId 过滤")
    void wbDp006_listAppealsFiltersByOwnerWithoutRule() {
        when(submissionAppealMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class)))
                .thenReturn(new Page<>(1, 20, 0));
        when(submissionAppealAssembler.assemble(org.mockito.ArgumentMatchers.<List<SubmissionAppealEntity>>any()))
                .thenReturn(List.of());

        service.listAppeals(new ParsedListQuery(1, 20, null, List.of(), List.of()));

        verify(submissionAppealMapper).selectPage(any(Page.class), any(LambdaQueryWrapper.class));
        assertThat(DataScopeAspect.currentRule()).isNull();
    }

    @Test
    @DisplayName("WB-DP-006: 有 TASK DataScope 规则时 listAppeals 走任务子查询过滤")
    void wbDp006_listAppealsAppliesTaskScopeWhenRulePresent() {
        ruleContext.set(new DataPermissionRule(
                DataResourceType.TASK,
                Set.of("LABELER"),
                List.of(),
                List.of(new SqlPredicate(
                        "EXISTS (SELECT 1 FROM task_members tm WHERE tm.task_id = tasks.id AND tm.user_id = ?)",
                        List.of(11001L)))));
        when(submissionAppealMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class)))
                .thenReturn(new Page<>(1, 20, 0));
        when(submissionAppealAssembler.assemble(org.mockito.ArgumentMatchers.<List<SubmissionAppealEntity>>any()))
                .thenReturn(List.of());

        service.listAppeals(new ParsedListQuery(1, 20, null, List.of(), List.of()));

        verify(submissionAppealMapper).selectPage(any(Page.class), any(LambdaQueryWrapper.class));
        assertThat(DataScopeAspect.currentRule()).isNotNull();
    }

    private static AuthenticatedUser labelerUser() {
        return new AuthenticatedUser(
                11001L,
                "labeler_001",
                "Labeler",
                Set.of("LABELER"),
                Set.of("business:task:read"),
                List.of(),
                Set.of());
    }
}
