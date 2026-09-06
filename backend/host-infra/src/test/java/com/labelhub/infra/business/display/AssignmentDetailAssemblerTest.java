package com.labelhub.infra.business.display;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.core.business.BusinessDtos.AssignmentDetail;
import com.labelhub.infra.business.display.assembler.AssignmentSummaryAssembler;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

@SpringJUnitConfig(DisplayAssemblerTestConfiguration.class)
class AssignmentDetailAssemblerTest {

    @Autowired
    private AssignmentSummaryAssembler assembler;

    @BeforeEach
    void setUp() {
        DisplayAssemblerTestConfigurationSupport.reset();
    }

    @Test
    void assembleDetail_batchLoadsRelatedData() {
        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setId(1L);
        assignment.setTaskId(10L);
        assignment.setItemId(20L);
        assignment.setSlotNo(1);
        assignment.setLabelerId(30L);
        assignment.setAssignType("MANUAL_ASSIGN");
        assignment.setClaimSource("ADMIN");
        assignment.setStatus("CLAIMED");
        assignment.setCurrentRoundNo(2);
        assignment.setExtJson("{\"note\":\"x\"}");
        assignment.setCreatedAt(Instant.parse("2026-01-01T08:00:00Z"));
        assignment.setClaimedAt(Instant.parse("2026-01-01T09:00:00Z"));

        TaskEntity task = new TaskEntity();
        task.setId(10L);
        task.setDeletedFlag(0);
        task.setTitle("演示任务");
        task.setTaskCode("TASK-001");

        TaskItemEntity item = new TaskItemEntity();
        item.setId(20L);
        item.setDeletedFlag(0);
        item.setSeqNo(3);
        item.setSourceItemKey("P0003");
        item.setPayloadJson("{\"prompt\":\"hello\"}");

        DisplayAssemblerTestConfigurationSupport.registerTask(task);
        DisplayAssemblerTestConfigurationSupport.registerTaskItem(item);

        AssignmentDetail detail = assembler.assembleDetail(assignment);

        assertThat(detail.taskTitle()).isEqualTo("演示任务");
        assertThat(detail.labelerName()).isEqualTo("标注员甲");
        assertThat(detail.claimSource()).isEqualTo("ADMIN");
        assertThat(detail.currentRoundNo()).isEqualTo(2);
        assertThat(detail.extJson()).containsEntry("note", "x");
        assertThat(detail.payloadPreview()).containsEntry("prompt", "hello");
        assertThat(detail.lifecycleTimeline()).isNotEmpty();
        assertThat(detail.lifecycleTimeline())
                .anyMatch(entry -> "标注员认领".equals(entry.label()));
    }
}
