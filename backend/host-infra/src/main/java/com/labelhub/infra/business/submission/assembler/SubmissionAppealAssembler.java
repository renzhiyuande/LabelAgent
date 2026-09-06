package com.labelhub.infra.business.submission.assembler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealBatchOperationSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealDetail;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionDetail;
import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.infra.business.display.TaskPayloadPreviewSupport;
import com.labelhub.infra.business.display.assembler.SubmissionSummaryAssembler;
import com.labelhub.infra.persistence.entity.AppealBatchOperationEntity;
import com.labelhub.infra.persistence.entity.SubmissionAppealEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionAppealAssembler {
    private final SubmissionMapper submissionMapper;
    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;
    private final SubmissionSummaryAssembler submissionSummaryAssembler;
    private final UserDisplayNameResolver userDisplayNameResolver;
    private final ObjectMapper objectMapper;

    public SubmissionAppealAssembler(
            SubmissionMapper submissionMapper,
            TaskMapper taskMapper,
            TaskItemMapper taskItemMapper,
            SubmissionSummaryAssembler submissionSummaryAssembler,
            UserDisplayNameResolver userDisplayNameResolver,
            ObjectMapper objectMapper) {
        this.submissionMapper = submissionMapper;
        this.taskMapper = taskMapper;
        this.taskItemMapper = taskItemMapper;
        this.submissionSummaryAssembler = submissionSummaryAssembler;
        this.userDisplayNameResolver = userDisplayNameResolver;
        this.objectMapper = objectMapper;
    }

    public List<SubmissionAppealSummary> assemble(List<SubmissionAppealEntity> appeals) {
        return appeals.stream().map(this::assemble).toList();
    }

    public SubmissionAppealSummary assemble(SubmissionAppealEntity appeal) {
        if (appeal == null) {
            return null;
        }
        SubmissionEntity submission = loadSubmission(appeal.getSubmissionId());
        SubmissionSummary submissionSummary = submission == null ? null
                : submissionSummaryAssembler.assemble(submission);
        TaskEntity task = appeal.getTaskId() == null ? null : taskMapper.selectById(appeal.getTaskId());
        return toSummary(appeal, submission, submissionSummary, task);
    }

    public SubmissionAppealDetail assembleDetail(SubmissionAppealEntity appeal) {
        if (appeal == null) {
            return null;
        }
        SubmissionAppealSummary summary = assemble(appeal);
        SubmissionEntity submission = loadSubmission(appeal.getSubmissionId());
        String templateSchemaJson = null;
        Map<String, Object> draftData = Map.of();
        if (submission != null) {
            SubmissionDetail submissionDetail = submissionSummaryAssembler.assembleDetail(
                    submission,
                    readMap(submission.getDraftDataJson()),
                    readMap(submission.getExtJson()));
            templateSchemaJson = submissionDetail.templateSchemaJson();
            draftData = submissionDetail.draftData() == null ? Map.of() : submissionDetail.draftData();
        }
        Map<String, Object> itemPayload = loadItemPayload(submission);
        String payloadJson = loadItemPayloadJson(submission);
        return toDetail(summary, templateSchemaJson, draftData, itemPayload, payloadJson);
    }

    public SubmissionAppealBatchOperationSummary assembleBatch(AppealBatchOperationEntity entity) {
        if (entity == null) {
            return null;
        }
        return new SubmissionAppealBatchOperationSummary(
                entity.getId(),
                entity.getBatchKey(),
                entity.getTaskId(),
                entity.getOperatorId(),
                entity.getBatchAction(),
                entity.getTargetTotalCount(),
                entity.getSuccessCount(),
                entity.getFailedCount(),
                entity.getStatus(),
                entity.getStartedAt(),
                entity.getFinishedAt(),
                entity.getFailureSummaryJson(),
                entity.getCreatedAt());
    }

    private SubmissionAppealSummary toSummary(
            SubmissionAppealEntity appeal,
            SubmissionEntity submission,
            SubmissionSummary submissionSummary,
            TaskEntity task) {
        return new SubmissionAppealSummary(
                appeal.getId(),
                appeal.getSubmissionId(),
                buildSubmissionDisplayLabel(submissionSummary),
                appeal.getAssignmentId(),
                appeal.getTaskId(),
                task == null ? null : task.getTitle(),
                submissionSummary == null ? null : submissionSummary.itemId(),
                submissionSummary == null ? null : submissionSummary.itemSeqNo(),
                submissionSummary == null ? null : submissionSummary.sourceItemKey(),
                submissionSummary == null ? Map.of() : submissionSummary.payloadPreview(),
                submissionSummary == null ? null : submissionSummary.draftPreviewText(),
                submissionSummary == null ? null : submissionSummary.currentRoundNo(),
                appeal.getLabelerId(),
                appeal.getLabelerId() == null ? null : userDisplayNameResolver.resolve(appeal.getLabelerId()),
                appeal.getOwnerId(),
                appeal.getOwnerId() == null ? null : userDisplayNameResolver.resolve(appeal.getOwnerId()),
                submission == null ? null : submission.getCurrentStatus(),
                appeal.getAppealNo(),
                appeal.getStatus(),
                appeal.getReasonText(),
                appeal.getDecisionReasonText(),
                appeal.getDecidedBy(),
                appeal.getDecidedAt(),
                appeal.getCreatedAt());
    }

    private static SubmissionAppealDetail toDetail(
            SubmissionAppealSummary summary,
            String templateSchemaJson,
            Map<String, Object> draftData,
            Map<String, Object> itemPayload,
            String payloadJson) {
        return new SubmissionAppealDetail(
                summary.id(),
                summary.submissionId(),
                summary.submissionDisplayLabel(),
                summary.assignmentId(),
                summary.taskId(),
                summary.taskTitle(),
                summary.itemId(),
                summary.itemSeqNo(),
                summary.sourceItemKey(),
                summary.payloadPreview(),
                summary.draftPreviewText(),
                summary.currentRoundNo(),
                summary.labelerId(),
                summary.labelerName(),
                summary.ownerId(),
                summary.ownerName(),
                summary.submissionStatus(),
                summary.appealNo(),
                summary.status(),
                summary.reasonText(),
                summary.decisionReasonText(),
                summary.decidedBy(),
                summary.decidedAt(),
                summary.createdAt(),
                templateSchemaJson,
                draftData,
                itemPayload,
                payloadJson);
    }

    private SubmissionEntity loadSubmission(Long submissionId) {
        if (submissionId == null) {
            return null;
        }
        SubmissionEntity submission = submissionMapper.selectById(submissionId);
        if (submission == null || submission.getDeletedFlag() == 1) {
            return null;
        }
        return submission;
    }

    private Map<String, Object> loadItemPayload(SubmissionEntity submission) {
        if (submission == null || submission.getItemId() == null) {
            return Map.of();
        }
        TaskItemEntity item = taskItemMapper.selectById(submission.getItemId());
        if (item == null || item.getDeletedFlag() == 1) {
            return Map.of();
        }
        return TaskPayloadPreviewSupport.toPayloadMap(objectMapper, item.getPayloadJson());
    }

    private String loadItemPayloadJson(SubmissionEntity submission) {
        if (submission == null || submission.getItemId() == null) {
            return null;
        }
        TaskItemEntity item = taskItemMapper.selectById(submission.getItemId());
        if (item == null || item.getDeletedFlag() == 1) {
            return null;
        }
        return item.getPayloadJson();
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

    private static String buildSubmissionDisplayLabel(SubmissionSummary submissionSummary) {
        if (submissionSummary == null || submissionSummary.id() == null) {
            return null;
        }
        String itemLabel = StringUtils.hasText(submissionSummary.sourceItemKey())
                ? submissionSummary.sourceItemKey()
                : "提交";
        if (submissionSummary.currentRoundNo() != null) {
            return itemLabel + " · 第" + submissionSummary.currentRoundNo() + "轮";
        }
        return itemLabel + " · " + submissionSummary.id();
    }
}
