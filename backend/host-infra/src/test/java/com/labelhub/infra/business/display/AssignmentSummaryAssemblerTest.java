package com.labelhub.infra.business.display;

import static org.assertj.core.api.Assertions.assertThat;

import com.labelhub.core.business.BusinessDtos.AssignmentSummary;
import com.labelhub.infra.business.display.DisplayAssemblerTestConfiguration;
import com.labelhub.infra.business.display.DisplayAssemblerTestConfigurationSupport;
import com.labelhub.infra.business.display.assembler.AssignmentSummaryAssembler;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

@SpringJUnitConfig(DisplayAssemblerTestConfiguration.class)
class AssignmentSummaryAssemblerTest {

    @Autowired
    private AssignmentSummaryAssembler assembler;

    @BeforeEach
    void setUp() {
        DisplayAssemblerTestConfigurationSupport.reset();
    }

    @Test
    void assemble_batchLoadsTaskAndItem() {
        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setId(1L);
        assignment.setTaskId(10L);
        assignment.setItemId(20L);
        assignment.setSlotNo(1);
        assignment.setLabelerId(30L);
        assignment.setAssignType("MANUAL_ASSIGN");
        assignment.setStatus("CLAIMED");

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
        item.setPayloadJson("{\"prompt\":\"hello\",\"lang\":\"zh\"}");

        DisplayAssemblerTestConfigurationSupport.registerTask(task);
        DisplayAssemblerTestConfigurationSupport.registerTaskItem(item);

        List<AssignmentSummary> summaries = assembler.assemble(List.of(assignment));

        assertThat(summaries).hasSize(1);
        AssignmentSummary summary = summaries.get(0);
        assertThat(summary.taskTitle()).isEqualTo("演示任务");
        assertThat(summary.taskCode()).isEqualTo("TASK-001");
        assertThat(summary.itemSeqNo()).isEqualTo(3);
        assertThat(summary.sourceItemKey()).isEqualTo("P0003");
        assertThat(summary.labelerName()).isEqualTo("标注员甲");
        assertThat(summary.payloadPreview()).containsEntry("prompt", "hello");
    }
}
