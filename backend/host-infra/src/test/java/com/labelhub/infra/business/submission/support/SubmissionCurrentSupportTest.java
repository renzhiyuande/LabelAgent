package com.labelhub.infra.business.submission.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.dao.DuplicateKeyException;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.statemachine.SubmissionStatus;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SubmissionCurrentSupportTest {

    @BeforeAll
    static void initMybatisPlusEntityMetadata() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant =
                new MapperBuilderAssistant(configuration, SubmissionCurrentSupportTest.class.getName());
        TableInfoHelper.initTableInfo(assistant, SubmissionEntity.class);
        TableInfoHelper.initTableInfo(assistant, TaskEntity.class);
        TableInfoHelper.initTableInfo(assistant, TemplateVersionEntity.class);
    }

    @Mock
    private SubmissionMapper submissionMapper;

    @Mock
    private TaskMapper taskMapper;

    @Mock
    private TemplateVersionMapper templateVersionMapper;

    @InjectMocks
    private SubmissionCurrentSupport support;

    @Test
    void ensureCurrentDraftForAssignment_supersedesOldLabelerAndCreatesNewSubmission() {
        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setId(100L);
        assignment.setTaskId(200L);
        assignment.setItemId(300L);
        assignment.setLabelerId(2L);
        assignment.setCurrentRoundNo(1);
        assignment.setDeletedFlag(0);

        SubmissionEntity existing = new SubmissionEntity();
        existing.setId(1L);
        existing.setAssignmentId(100L);
        existing.setTaskId(200L);
        existing.setItemId(300L);
        existing.setLabelerId(1L);
        existing.setIsCurrent(SubmissionCurrentSupport.CURRENT_FLAG);
        existing.setCurrentStatus(SubmissionStatus.DRAFT.name());
        existing.setDraftDataJson("{\"note\":\"labeler-a\"}");
        existing.setDeletedFlag(0);

        TaskEntity task = new TaskEntity();
        task.setId(200L);
        task.setDeletedFlag(0);
        task.setCurrentTemplateVersionId(900L);

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(900L);
        version.setDeletedFlag(0);
        version.setStatus("PUBLISHED");

        when(submissionMapper.selectOne(any())).thenReturn(existing);
        when(taskMapper.selectById(200L)).thenReturn(task);
        when(templateVersionMapper.selectById(900L)).thenReturn(version);

        SubmissionEntity created = support.ensureCurrentDraftForAssignment(
                assignment,
                SubmissionSupersedeReason.LABELER_REASSIGNED.name());

        verify(submissionMapper).update(isNull(), any());
        assertEquals(SubmissionStatus.ABANDONED.name(), existing.getCurrentStatus());
        verify(submissionMapper).insert(any(SubmissionEntity.class));
        assertEquals(2L, created.getLabelerId());
        assertEquals(SubmissionCurrentSupport.CURRENT_FLAG, created.getIsCurrent());
        assertEquals(SubmissionStatus.DRAFT.name(), created.getCurrentStatus());
    }

    @Test
    void ensureCurrentDraftForAssignment_recoversFromDuplicateCurrentKey() {
        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setId(100L);
        assignment.setTaskId(200L);
        assignment.setItemId(300L);
        assignment.setLabelerId(2L);
        assignment.setCurrentRoundNo(1);
        assignment.setDeletedFlag(0);

        SubmissionEntity existing = new SubmissionEntity();
        existing.setId(9L);
        existing.setAssignmentId(100L);
        existing.setLabelerId(2L);
        existing.setIsCurrent(SubmissionCurrentSupport.CURRENT_FLAG);
        existing.setCurrentStatus(SubmissionStatus.DRAFT.name());
        existing.setDeletedFlag(0);

        TaskEntity task = new TaskEntity();
        task.setId(200L);
        task.setDeletedFlag(0);
        task.setCurrentTemplateVersionId(900L);

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(900L);
        version.setDeletedFlag(0);
        version.setStatus("PUBLISHED");

        when(submissionMapper.selectOne(any()))
                .thenReturn(null)
                .thenReturn(existing);
        when(taskMapper.selectById(200L)).thenReturn(task);
        when(templateVersionMapper.selectById(900L)).thenReturn(version);
        when(submissionMapper.insert(any(SubmissionEntity.class)))
                .thenThrow(new DuplicateKeyException("uk_submissions_assignment_current"));

        SubmissionEntity result = support.ensureCurrentDraftForAssignment(
                assignment,
                SubmissionSupersedeReason.LABELER_CLAIMED.name());

        assertEquals(9L, result.getId());
        verify(submissionMapper, times(1)).insert(any(SubmissionEntity.class));
    }

    @Test
    void ensureCurrentDraftForAssignment_replacesAbandonedStaleCurrentForSameLabeler() {
        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setId(100L);
        assignment.setTaskId(200L);
        assignment.setItemId(300L);
        assignment.setLabelerId(2L);
        assignment.setCurrentRoundNo(1);
        assignment.setDeletedFlag(0);

        SubmissionEntity stale = new SubmissionEntity();
        stale.setId(1L);
        stale.setAssignmentId(100L);
        stale.setTaskId(200L);
        stale.setItemId(300L);
        stale.setLabelerId(2L);
        stale.setIsCurrent(SubmissionCurrentSupport.CURRENT_FLAG);
        stale.setCurrentStatus(SubmissionStatus.ABANDONED.name());
        stale.setDeletedFlag(0);

        TaskEntity task = new TaskEntity();
        task.setId(200L);
        task.setDeletedFlag(0);
        task.setCurrentTemplateVersionId(900L);

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(900L);
        version.setDeletedFlag(0);
        version.setStatus("PUBLISHED");

        when(submissionMapper.selectOne(any())).thenReturn(stale);
        when(taskMapper.selectById(200L)).thenReturn(task);
        when(templateVersionMapper.selectById(900L)).thenReturn(version);

        SubmissionEntity created = support.ensureCurrentDraftForAssignment(
                assignment,
                SubmissionSupersedeReason.LABELER_CLAIMED.name());

        verify(submissionMapper).update(isNull(), any());
        verify(submissionMapper).insert(any(SubmissionEntity.class));
        assertEquals(SubmissionStatus.DRAFT.name(), created.getCurrentStatus());
        assertEquals(SubmissionCurrentSupport.CURRENT_FLAG, created.getIsCurrent());
    }
}
