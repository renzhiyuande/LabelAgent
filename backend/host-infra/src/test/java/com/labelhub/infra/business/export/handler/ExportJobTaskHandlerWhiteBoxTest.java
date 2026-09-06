package com.labelhub.infra.business.export.handler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.business.export.support.ExportFieldDisplaySupport;
import com.labelhub.infra.business.storage.service.MinioFileStorageService;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.ExportJobEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.ExportJobMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — ExportJobTaskHandler")
class ExportJobTaskHandlerWhiteBoxTest {

    @Mock
    private ExportJobMapper exportJobMapper;
    @Mock
    private SubmissionMapper submissionMapper;
    @Mock
    private TaskItemMapper taskItemMapper;
    @Mock
    private ReviewRecordMapper reviewRecordMapper;
    @Mock
    private AiReviewRecordMapper aiReviewRecordMapper;
    @Mock
    private MinioFileStorageService fileStorageService;
    @Mock
    private ExportFieldDisplaySupport exportFieldDisplaySupport;

    private ExportJobTaskHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ExportJobTaskHandler(
                exportJobMapper,
                submissionMapper,
                taskItemMapper,
                reviewRecordMapper,
                aiReviewRecordMapper,
                fileStorageService,
                exportFieldDisplaySupport,
                new ObjectMapper());
    }

    @Test
    @DisplayName("WB-ASYNC-004 / WB-XSYS-005: 导出任务生成文件并回写 SUCCESS")
    void wbAsync004_exportJobWritesFileAndMarksSuccess() {
        ExportJobEntity job = exportJob(7001L, 15001L);
        AsyncTaskEntity task = new AsyncTaskEntity();
        task.setBizId(7001L);

        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(19002L);
        submission.setTaskId(15001L);
        submission.setItemId(16002L);
        submission.setAssignmentId(18002L);
        submission.setDeletedFlag(0);
        submission.setCurrentStatus("APPROVED");
        submission.setLabelerId(11001L);

        when(exportJobMapper.selectById(7001L)).thenReturn(job);
        when(submissionMapper.selectList(any())).thenReturn(List.of(submission));
        ExportFieldDisplaySupport.DisplayContext displayContext =
                mock(ExportFieldDisplaySupport.DisplayContext.class);
        when(displayContext.toDisplayRow(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(displayContext.headers()).thenReturn(List.of("lifecycle.status", "labeler.id"));
        when(exportFieldDisplaySupport.buildContext(eq(15001L), any())).thenReturn(displayContext);
        when(fileStorageService.upload(any(), any(), any(), eq("EXPORT_RESULT"), eq(1001L)))
                .thenReturn(88001L);

        handler.handle(task);

        ArgumentCaptor<ExportJobEntity> captor = ArgumentCaptor.forClass(ExportJobEntity.class);
        verify(exportJobMapper, org.mockito.Mockito.atLeastOnce()).updateById(captor.capture());
        ExportJobEntity finalJob = captor.getAllValues().get(captor.getAllValues().size() - 1);
        assertThat(finalJob.getStatus()).isEqualTo("SUCCESS");
        assertThat(finalJob.getProgressPercent()).isEqualTo(100);
        assertThat(finalJob.getResultFileId()).isEqualTo(88001L);
        assertThat(finalJob.getExportedRecords()).isEqualTo(1);
        assertThat(finalJob.getChecksum()).isNotBlank();
    }

    private static ExportJobEntity exportJob(long id, long taskId) {
        ExportJobEntity job = new ExportJobEntity();
        job.setId(id);
        job.setTaskId(taskId);
        job.setDeletedFlag(0);
        job.setStatus("PENDING");
        job.setFormatCode("JSON");
        job.setFieldMapJson("[\"lifecycle.status\",\"labeler.id\"]");
        job.setFiltersJson("{\"exportScope\":\"ALL\"}");
        job.setRequestedBy(1001L);
        return job;
    }
}
