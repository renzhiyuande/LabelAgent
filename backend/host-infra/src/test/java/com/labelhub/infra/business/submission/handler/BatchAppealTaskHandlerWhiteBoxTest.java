package com.labelhub.infra.business.submission.handler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.business.submission.workflow.SubmissionAppealLifecycle;
import com.labelhub.infra.persistence.entity.AppealBatchOperationEntity;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AppealBatchOperationMapper;
import com.labelhub.infra.persistence.mapper.SubmissionAppealMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — BatchAppealTaskHandler")
class BatchAppealTaskHandlerWhiteBoxTest {

    @Mock
    private SubmissionMapper submissionMapper;
    @Mock
    private SubmissionAppealMapper submissionAppealMapper;
    @Mock
    private AppealBatchOperationMapper appealBatchOperationMapper;
    @Mock
    private SubmissionAppealLifecycle submissionAppealLifecycle;

    private BatchAppealTaskHandler handler;

    @BeforeEach
    void setUp() {
        handler = new BatchAppealTaskHandler(
                submissionMapper,
                submissionAppealMapper,
                appealBatchOperationMapper,
                submissionAppealLifecycle,
                new ObjectMapper());
    }

    @Test
    @DisplayName("WB-ASYNC-006: SUBMIT_APPEAL 批量走 SubmissionAppealLifecycle")
    void wbAsync006_submitAppealBatchDelegatesToLifecycle() {
        AppealBatchOperationEntity operation = new AppealBatchOperationEntity();
        operation.setId(8001L);
        when(appealBatchOperationMapper.selectById(8001L)).thenReturn(operation);

        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(19003L);
        when(submissionMapper.selectById(19003L)).thenReturn(submission);

        AsyncTaskEntity task = new AsyncTaskEntity();
        task.setBizKey("batch-appeal-8001");
        task.setPayloadJson("""
                {
                  "batchOperationId": 8001,
                  "action": "SUBMIT_APPEAL",
                  "reasonText": "unfair reject",
                  "submissionIds": [19003]
                }
                """);

        handler.handle(task);

        verify(submissionAppealLifecycle).submitAppeal(eq(submission), eq("unfair reject"), eq("batch-appeal-8001"));

        ArgumentCaptor<AppealBatchOperationEntity> captor = ArgumentCaptor.forClass(AppealBatchOperationEntity.class);
        verify(appealBatchOperationMapper, org.mockito.Mockito.atLeastOnce()).updateById(captor.capture());
        AppealBatchOperationEntity finalOp = captor.getAllValues().get(captor.getAllValues().size() - 1);
        assertThat(finalOp.getStatus()).isEqualTo("SUCCESS");
        assertThat(finalOp.getSuccessCount()).isEqualTo(1);
        assertThat(finalOp.getFailedCount()).isZero();
    }
}
