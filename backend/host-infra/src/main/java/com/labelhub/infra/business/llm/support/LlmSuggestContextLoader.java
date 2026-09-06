package com.labelhub.infra.business.llm.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.LlmSuggestCommand;
import com.labelhub.core.business.BusinessDtos.LlmSuggestPreviewCommand;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.submission.support.LabelerSubmissionAccessSupport;
import com.labelhub.infra.business.submission.support.SubmissionCurrentSupport;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LlmSuggestContextLoader {

    public record LoadedContext(
            TemplateVersionEntity templateVersion,
            Map<String, Object> itemPayload,
            Map<String, Object> formValues) {
    }

    private final AssignmentMapper assignmentMapper;
    private final TaskItemMapper taskItemMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final LabelerSubmissionAccessSupport labelerSubmissionAccessSupport;
    private final SubmissionCurrentSupport submissionCurrentSupport;
    private final ObjectMapper objectMapper;

    public LlmSuggestContextLoader(
            AssignmentMapper assignmentMapper,
            TaskItemMapper taskItemMapper,
            TemplateVersionMapper templateVersionMapper,
            LabelerSubmissionAccessSupport labelerSubmissionAccessSupport,
            SubmissionCurrentSupport submissionCurrentSupport,
            ObjectMapper objectMapper) {
        this.assignmentMapper = assignmentMapper;
        this.taskItemMapper = taskItemMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.labelerSubmissionAccessSupport = labelerSubmissionAccessSupport;
        this.submissionCurrentSupport = submissionCurrentSupport;
        this.objectMapper = objectMapper;
    }

    public LoadedContext loadForSuggest(LlmSuggestCommand command) {
        TemplateVersionEntity version = requireTemplateVersion(command.templateVersionId());
        if (!StringUtils.hasText(command.fieldCode())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "fieldCode is required");
        }

        AssignmentEntity assignment = null;
        SubmissionEntity submission = null;

        if (command.submissionId() != null) {
            submission = labelerSubmissionAccessSupport.requireOwnedSubmission(command.submissionId());
            if (command.assignmentId() != null && !command.assignmentId().equals(submission.getAssignmentId())) {
                throw new BusinessException(ErrorCode.INVALID_OPERATION, "assignmentId does not match submission");
            }
            assignment = labelerSubmissionAccessSupport.requireOwnedAssignment(submission.getAssignmentId());
        } else if (command.assignmentId() != null) {
            assignment = labelerSubmissionAccessSupport.requireOwnedAssignment(command.assignmentId());
            submission = findCurrentSubmissionForAssignment(assignment.getId());
        } else {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "assignmentId or submissionId is required");
        }

        if (command.taskId() != null && !command.taskId().equals(assignment.getTaskId())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "taskId does not match assignment");
        }

        if (submission != null
                && submission.getCurrentTemplateVersionId() != null
                && !submission.getCurrentTemplateVersionId().equals(version.getId())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "templateVersionId does not match submission");
        }

        TaskItemEntity item = requireTaskItem(assignment.getItemId());
        return new LoadedContext(
                version,
                readMap(item.getPayloadJson()),
                submission == null ? Map.of() : readMap(submission.getDraftDataJson()));
    }

    public LoadedContext loadForPreview(LlmSuggestPreviewCommand command) {
        TemplateVersionEntity version = requireTemplateVersion(command.templateVersionId());
        if (!StringUtils.hasText(command.fieldCode())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "fieldCode is required");
        }

        if (command.taskItemId() != null) {
            TaskItemEntity item = requireTaskItem(command.taskItemId());
            Map<String, Object> draft = Map.of();
            if (command.submissionId() != null) {
                SubmissionEntity submission = labelerSubmissionAccessSupport.requireOwnedSubmission(command.submissionId());
                draft = readMap(submission.getDraftDataJson());
            }
            return new LoadedContext(version, readMap(item.getPayloadJson()), draft);
        }

        if (command.assignmentId() != null || command.submissionId() != null) {
            LlmSuggestCommand runtime = new LlmSuggestCommand(
                    command.fieldCode(),
                    command.templateVersionId(),
                    command.assignmentId(),
                    command.submissionId(),
                    command.taskId(),
                    null);
            return loadForSuggest(runtime);
        }

        return new LoadedContext(version, Map.of(), Map.of());
    }

    private TemplateVersionEntity requireTemplateVersion(Long templateVersionId) {
        if (templateVersionId == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "templateVersionId is required");
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(templateVersionId);
        if (version == null || Integer.valueOf(1).equals(version.getDeletedFlag())) {
            throw new BusinessException(
                    ErrorCode.TEMPLATE_NOT_FOUND,
                    "Template version not found: " + templateVersionId);
        }
        return version;
    }

    private SubmissionEntity findCurrentSubmissionForAssignment(Long assignmentId) {
        return submissionCurrentSupport.findCurrentByAssignmentId(assignmentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND));
    }

    private TaskItemEntity requireTaskItem(Long itemId) {
        if (itemId == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "task item not found");
        }
        TaskItemEntity item = taskItemMapper.selectById(itemId);
        if (item == null || item.getDeletedFlag() == null || item.getDeletedFlag() != 0) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "task item not found");
        }
        return item;
    }

    private Map<String, Object> readMap(String json) {
        if (!StringUtils.hasText(json)) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }
}
