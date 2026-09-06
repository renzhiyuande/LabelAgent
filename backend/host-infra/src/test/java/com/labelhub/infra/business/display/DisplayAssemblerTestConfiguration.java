package com.labelhub.infra.business.display;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.business.display.assembler.AssignmentSummaryAssembler;
import com.labelhub.infra.business.display.assembler.SubmissionSummaryAssembler;
import com.labelhub.infra.business.display.assembler.SubmissionTimelineAssembler;
import com.labelhub.infra.business.submission.workflow.SubmissionTransitionPolicy;
import com.labelhub.infra.business.display.container.BusinessDisplayContainers;
import com.labelhub.infra.business.display.container.TaskDisplayContainers;
import com.labelhub.infra.business.display.container.UserDisplayNameContainer;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.AuditLogMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionAppealMapper;
import com.labelhub.infra.persistence.mapper.SubmissionStatusHistoryMapper;
import com.labelhub.infra.persistence.mapper.SubmissionVersionMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

@TestConfiguration
@EnableAutoConfiguration(exclude = DataSourceAutoConfiguration.class)
@Import({
        TaskDisplayContainers.class,
        BusinessDisplayContainers.class,
        UserDisplayNameContainer.class,
        AssignmentSummaryAssembler.class,
        SubmissionTimelineAssembler.class,
        SubmissionSummaryAssembler.class
})
public class DisplayAssemblerTestConfiguration {

    @Bean
    ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    TaskMapper taskMapper() {
        return DisplayAssemblerTestConfigurationSupport.taskMapper();
    }

    @Bean
    TemplateVersionMapper templateVersionMapper() {
        return DisplayAssemblerTestConfigurationSupport.templateVersionMapper();
    }

    @Bean
    TaskItemMapper taskItemMapper() {
        return DisplayAssemblerTestConfigurationSupport.taskItemMapper();
    }

    @Bean
    AssignmentMapper assignmentMapper() {
        return DisplayAssemblerTestConfigurationSupport.assignmentMapper();
    }

    @Bean
    ReviewRecordMapper reviewRecordMapper() {
        return DisplayAssemblerTestConfigurationSupport.reviewRecordMapper();
    }

    @Bean
    UserDisplayNameResolver userDisplayNameResolver() {
        return DisplayAssemblerTestConfigurationSupport.userDisplayNameResolver();
    }

    @Bean
    SubmissionTransitionPolicy submissionTransitionPolicy(
            ObjectMapper objectMapper, ReviewRecordMapper reviewRecordMapper) {
        return new SubmissionTransitionPolicy(objectMapper, reviewRecordMapper);
    }

    @Bean
    SubmissionVersionMapper submissionVersionMapper() {
        return DisplayAssemblerTestConfigurationSupport.emptyListMapper(SubmissionVersionMapper.class);
    }

    @Bean
    SubmissionStatusHistoryMapper submissionStatusHistoryMapper() {
        return DisplayAssemblerTestConfigurationSupport.emptyListMapper(SubmissionStatusHistoryMapper.class);
    }

    @Bean
    SubmissionAppealMapper submissionAppealMapper() {
        return DisplayAssemblerTestConfigurationSupport.emptyListMapper(SubmissionAppealMapper.class);
    }

    @Bean
    AuditLogMapper auditLogMapper() {
        return DisplayAssemblerTestConfigurationSupport.emptyListMapper(AuditLogMapper.class);
    }

    static void resetStubs() {
        DisplayAssemblerTestConfigurationSupport.reset();
    }
}
