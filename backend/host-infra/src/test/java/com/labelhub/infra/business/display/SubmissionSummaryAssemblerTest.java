package com.labelhub.infra.business.display;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.infra.business.display.DisplayAssemblerTestConfiguration;
import com.labelhub.infra.business.display.DisplayAssemblerTestConfigurationSupport;
import com.labelhub.infra.business.display.assembler.SubmissionSummaryAssembler;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

@SpringJUnitConfig(DisplayAssemblerTestConfiguration.class)
class SubmissionSummaryAssemblerTest {

    @Autowired
    private SubmissionSummaryAssembler assembler;

    @BeforeEach
    void setUp() {
        DisplayAssemblerTestConfigurationSupport.reset();
    }

    @Test
    void assemble_batchLoadsTaskAndItem() {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(1L);
        submission.setAssignmentId(5L);
        submission.setTaskId(10L);
        submission.setItemId(20L);
        submission.setLabelerId(30L);
        submission.setCurrentStatus("APPROVED");
        submission.setCurrentRoundNo(1);

        TaskEntity task = new TaskEntity();
        task.setId(10L);
        task.setDeletedFlag(0);
        task.setTitle("演示任务");
        task.setTaskCode("TASK-001");
        task.setOwnerId(40L);

        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setId(5L);
        assignment.setDeletedFlag(0);
        assignment.setStatus("CLAIMED");
        assignment.setAssignType("AUTO_CLAIM");
        assignment.setSlotNo(1);
        assignment.setClaimedAt(Instant.parse("2026-06-03T06:00:00Z"));

        TaskItemEntity item = new TaskItemEntity();
        item.setId(20L);
        item.setDeletedFlag(0);
        item.setSeqNo(3);
        item.setSourceItemKey("P0003");
        item.setPayloadJson("{\"prompt\":\"hello\"}");

        DisplayAssemblerTestConfigurationSupport.registerTask(task);
        DisplayAssemblerTestConfigurationSupport.registerTaskItem(item);
        DisplayAssemblerTestConfigurationSupport.registerAssignment(assignment);

        List<SubmissionSummary> summaries = assembler.assemble(List.of(submission));

        assertThat(summaries).hasSize(1);
        SubmissionSummary summary = summaries.get(0);
        assertThat(summary.taskTitle()).isEqualTo("演示任务");
        assertThat(summary.sourceItemKey()).isEqualTo("P0003");
        assertThat(summary.labelerName()).isEqualTo("标注员甲");
        assertThat(summary.ownerId()).isEqualTo(40L);
        assertThat(summary.ownerName()).isEqualTo("任务 Owner");
        assertThat(summary.assignmentStatus()).isEqualTo("CLAIMED");
        assertThat(summary.assignmentAssignType()).isEqualTo("AUTO_CLAIM");
        assertThat(summary.reviewerName()).isNull();
        assertThat(summary.payloadPreview()).containsEntry("prompt", "hello");
    }

    @Test
    void assemble_mapsDraftDataToPreviewText() {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(2L);
        submission.setAssignmentId(5L);
        submission.setTaskId(10L);
        submission.setItemId(20L);
        submission.setLabelerId(30L);
        submission.setCurrentStatus("DRAFT");
        submission.setCurrentTemplateVersionId(100L);
        submission.setDraftDataJson("{\"sentiment\":\"正向\"}");

        TaskEntity task = new TaskEntity();
        task.setId(10L);
        task.setDeletedFlag(0);
        task.setTitle("演示任务");
        task.setTaskCode("TASK-001");

        TaskItemEntity item = new TaskItemEntity();
        item.setId(20L);
        item.setDeletedFlag(0);
        item.setSeqNo(1);
        item.setSourceItemKey("P0001");
        item.setPayloadJson("{}");

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(100L);
        version.setDeletedFlag(0);
        version.setSchemaJson("""
                {
                  "sections": [{
                    "fields": [
                      {"key":"sentiment","label":"情感倾向","meta":{"importRole":"input"}}
                    ]
                  }]
                }
                """);

        DisplayAssemblerTestConfigurationSupport.registerTask(task);
        DisplayAssemblerTestConfigurationSupport.registerTaskItem(item);
        DisplayAssemblerTestConfigurationSupport.registerTemplateVersion(version);

        SubmissionSummary summary = assembler.assemble(submission);

        assertThat(summary.draftPreviewText()).isEqualTo("情感倾向: 正向");
    }
}
