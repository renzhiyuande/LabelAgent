package com.labelhub.infra.business.task.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.TaskCreateCommand;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.distribute.DistributeStrategyRegistry;
import com.labelhub.infra.business.display.assembler.SubmissionTimelineAssembler;
import com.labelhub.infra.business.review.support.ReviewWorkflowResolver;
import com.labelhub.infra.business.review.support.ReviewWorkflowValidator;
import com.labelhub.infra.business.task.support.TaskTemplateCloneSupport;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.TaskItemImportBatchMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.TemplateReviewDimensionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionFieldMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("P2 白盒 — DbTaskService 创建任务")
class DbTaskServiceCreateWhiteBoxTest {

    @Mock
    private TaskMapper taskMapper;
    @Mock
    private TaskItemMapper taskItemMapper;
    @Mock
    private AssignmentMapper assignmentMapper;
    @Mock
    private TaskItemImportBatchMapper taskItemImportBatchMapper;
    @Mock
    private TemplateVersionMapper templateVersionMapper;
    @Mock
    private TemplateVersionFieldMapper templateVersionFieldMapper;
    @Mock
    private TemplatesMapper templatesMapper;
    @Mock
    private TemplateReviewDimensionMapper templateReviewDimensionMapper;
    @Mock
    private MybatisQueryApplier queryApplier;
    @Mock
    private DistributeStrategyRegistry distributeStrategyRegistry;
    @Mock
    private UserDisplayNameResolver userDisplayNameResolver;
    @Mock
    private SubmissionTimelineAssembler submissionTimelineAssembler;
    @Mock
    private ReviewWorkflowResolver reviewWorkflowResolver;
    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private TaskTemplateCloneSupport taskTemplateCloneSupport;

    private DbTaskService service;

    @BeforeEach
    void setUp() {
        ReviewWorkflowValidator reviewWorkflowValidator =
                new ReviewWorkflowValidator(new ObjectMapper(), reviewWorkflowResolver);
        when(reviewWorkflowResolver.parseDefinition(any())).thenReturn(List.of());
        when(currentUserContext.userIdOrZero()).thenReturn(100L);

        service = new DbTaskService(
                taskMapper,
                taskItemMapper,
                assignmentMapper,
                taskItemImportBatchMapper,
                templateVersionMapper,
                templateVersionFieldMapper,
                templatesMapper,
                templateReviewDimensionMapper,
                currentUserContext,
                new ObjectMapper(),
                queryApplier,
                distributeStrategyRegistry,
                userDisplayNameResolver,
                submissionTimelineAssembler,
                reviewWorkflowResolver,
                reviewWorkflowValidator,
                taskTemplateCloneSupport);
    }

    @Test
    @DisplayName("createTask 在插入前校验任务编码唯一性")
    void createTask_rejectsDuplicateTaskCodeBeforeInsert() {
        when(taskMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

        TaskCreateCommand command = new TaskCreateCommand(
                "TASK_DUP",
                "重复任务",
                null,
                "GENERAL",
                null,
                1,
                null,
                null,
                null,
                "FIRST_COME",
                null);

        assertThatThrownBy(() -> service.createTask(command))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).errorCode())
                        .isEqualTo(ErrorCode.TASK_CODE_DUPLICATE));

        verify(taskMapper, never()).insert(any(TaskEntity.class));
    }
}
