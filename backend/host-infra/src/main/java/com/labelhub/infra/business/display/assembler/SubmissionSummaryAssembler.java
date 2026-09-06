package com.labelhub.infra.business.display.assembler;

import cn.crane4j.core.support.Crane4jTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.SubmissionAttemptSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionDetail;
import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.infra.business.display.FormSchemaDraftPreviewSupport;
import com.labelhub.infra.business.display.TaskPayloadPreviewSupport;
import com.labelhub.infra.business.display.container.DisplayContainerBatchLoader;
import com.labelhub.infra.business.display.fill.SubmissionSummaryFill;
import com.labelhub.infra.business.display.support.FormSchemaRuntimeSanitizer;
import com.labelhub.infra.business.submission.workflow.SubmissionTransitionPolicy;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionSummaryAssembler {
    private final Crane4jTemplate crane4jTemplate;
    private final ObjectMapper objectMapper;
    private final TaskMapper taskMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final UserDisplayNameResolver userDisplayNameResolver;
    private final SubmissionTransitionPolicy submissionTransitionPolicy;
    private final SubmissionTimelineAssembler submissionTimelineAssembler;

    public SubmissionSummaryAssembler(
            Crane4jTemplate crane4jTemplate,
            ObjectMapper objectMapper,
            TaskMapper taskMapper,
            TemplateVersionMapper templateVersionMapper,
            UserDisplayNameResolver userDisplayNameResolver,
            SubmissionTransitionPolicy submissionTransitionPolicy,
            SubmissionTimelineAssembler submissionTimelineAssembler) {
        this.crane4jTemplate = crane4jTemplate;
        this.objectMapper = objectMapper;
        this.taskMapper = taskMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.userDisplayNameResolver = userDisplayNameResolver;
        this.submissionTransitionPolicy = submissionTransitionPolicy;
        this.submissionTimelineAssembler = submissionTimelineAssembler;
    }

    public List<SubmissionSummary> assemble(List<SubmissionEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return List.of();
        }
        // 批量预加载 Task，消除 toFill 中逐条 selectById 的 N+1
        Map<Long, TaskEntity> taskCache = preloadTasks(entities);
        List<SubmissionSummaryFill> fills = entities.stream()
                .map(e -> toFill(e, taskCache.get(e.getTaskId())))
                .toList();
        crane4jTemplate.execute(fills);
        applyOwnerDisplay(fills);
        applyDraftPreviews(fills, entities);
        fills.forEach(this::applyPayloadPreview);
        return fills.stream().map(this::toSummaryRecord).toList();
    }

    private Map<Long, TaskEntity> preloadTasks(List<SubmissionEntity> entities) {
        Set<Long> taskIds = entities.stream()
                .map(SubmissionEntity::getTaskId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (taskIds.isEmpty()) {
            return Map.of();
        }
        return DisplayContainerBatchLoader.loadSoftDeleted(taskMapper, taskIds).stream()
                .collect(Collectors.toMap(TaskEntity::getId, t -> t));
    }

    public SubmissionSummary assemble(SubmissionEntity entity) {
        if (entity == null) {
            return null;
        }
        return assemble(List.of(entity)).get(0);
    }

    public List<SubmissionAttemptSummary> assembleAttempts(List<SubmissionEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return List.of();
        }
        List<SubmissionSummary> summaries = assemble(entities);
        List<SubmissionAttemptSummary> attempts = new ArrayList<>(entities.size());
        for (int i = 0; i < entities.size(); i++) {
            SubmissionEntity entity = entities.get(i);
            SubmissionSummary summary = summaries.get(i);
            attempts.add(new SubmissionAttemptSummary(
                    summary.id(),
                    summary.assignmentId(),
                    summary.labelerId(),
                    summary.labelerName(),
                    summary.status(),
                    summary.currentRoundNo(),
                    Integer.valueOf(1).equals(entity.getIsCurrent()),
                    entity.getSupersededAt(),
                    entity.getSupersededReason(),
                    entity.getSubmitCount(),
                    summary.draftPreviewText(),
                    summary.draftSavedAt(),
                    summary.lastSubmittedAt(),
                    summary.createdAt(),
                    entity.getUpdatedAt()));
        }
        return attempts;
    }

    public SubmissionDetail assembleDetail(
            SubmissionEntity entity,
            Map<String, Object> draftData,
            Map<String, Object> extJson) {
        if (entity == null) {
            return null;
        }
        SubmissionSummaryFill fill = toFill(entity);
        crane4jTemplate.execute(List.of(fill));
        applyOwnerDisplay(List.of(fill));
        applyDraftPreviews(List.of(fill), List.of(entity));
        applyPayloadPreview(fill);
        String templateSchemaJson = resolveTemplateSchemaJson(entity.getCurrentTemplateVersionId());
        return toDetailRecord(fill, draftData, extJson, templateSchemaJson);
    }

    private SubmissionSummaryFill toFill(SubmissionEntity entity) {
        TaskEntity task = entity.getTaskId() == null ? null : taskMapper.selectById(entity.getTaskId());
        return toFill(entity, task);
    }

    private SubmissionSummaryFill toFill(SubmissionEntity entity, TaskEntity task) {
        SubmissionSummaryFill fill = new SubmissionSummaryFill();
        fill.setId(entity.getId());
        fill.setAssignmentId(entity.getAssignmentId());
        fill.setTaskId(entity.getTaskId());
        fill.setItemId(entity.getItemId());
        fill.setLabelerId(entity.getLabelerId());
        fill.setStatus(entity.getCurrentStatus());
        fill.setCurrentRoundNo(entity.getCurrentRoundNo());
        fill.setDraftSavedAt(entity.getDraftSavedAt());
        fill.setLastSubmittedAt(entity.getLastSubmittedAt());
        fill.setCreatedAt(entity.getCreatedAt());
        fill.setSubmitCount(entity.getSubmitCount());
        fill.setLastReviewRecordId(entity.getLastReviewRecordId());
        fill.setCanWithdraw(submissionTransitionPolicy.canWithdraw(entity, task));
        fill.setCanAppeal(submissionTransitionPolicy.canAppeal(entity, task));
        fill.setWithdrawBlockReason(submissionTransitionPolicy.withdrawBlockReason(entity, task));
        fill.setAppealBlockReason(submissionTransitionPolicy.appealBlockReason(entity, task));
        return fill;
    }

    private void applyPayloadPreview(SubmissionSummaryFill fill) {
        fill.setPayloadPreview(
                TaskPayloadPreviewSupport.toPayloadPreview(objectMapper, fill.getItemPayloadJson()));
    }

    /** Owner 来自 Task 关联，需等 TASK 装配后再批量解析（Crane4j 单轮无法链式触发 USER 装配）。 */
    private void applyOwnerDisplay(List<SubmissionSummaryFill> fills) {
        Set<Long> taskIds = fills.stream()
                .map(SubmissionSummaryFill::getTaskId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (taskIds.isEmpty()) {
            return;
        }
        Map<Long, Long> ownerIdByTaskId = new HashMap<>();
        for (TaskEntity task : DisplayContainerBatchLoader.loadSoftDeleted(taskMapper, taskIds)) {
            if (task.getOwnerId() != null) {
                ownerIdByTaskId.put(task.getId(), task.getOwnerId());
            }
        }
        for (SubmissionSummaryFill fill : fills) {
            Long ownerId = ownerIdByTaskId.get(fill.getTaskId());
            if (ownerId == null) {
                continue;
            }
            fill.setOwnerId(ownerId);
            fill.setOwnerName(userDisplayNameResolver.resolve(ownerId));
        }
    }

    private void applyDraftPreviews(List<SubmissionSummaryFill> fills, List<SubmissionEntity> entities) {
        Set<Long> versionIds = entities.stream()
                .map(SubmissionEntity::getCurrentTemplateVersionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, String> schemaByVersionId = new HashMap<>();
        if (!versionIds.isEmpty()) {
            for (TemplateVersionEntity version :
                    DisplayContainerBatchLoader.loadSoftDeleted(templateVersionMapper, versionIds)) {
                schemaByVersionId.put(version.getId(), version.getSchemaJson());
            }
        }
        for (int i = 0; i < fills.size(); i++) {
            SubmissionEntity entity = entities.get(i);
            String schemaJson = schemaByVersionId.get(entity.getCurrentTemplateVersionId());
            fills.get(i)
                    .setDraftPreviewText(FormSchemaDraftPreviewSupport.toPreviewText(
                            objectMapper, schemaJson, entity.getDraftDataJson()));
        }
    }

    private SubmissionSummary toSummaryRecord(SubmissionSummaryFill fill) {
        return new SubmissionSummary(
                fill.getId(),
                fill.getAssignmentId(),
                fill.getTaskId(),
                fill.getItemId(),
                fill.getLabelerId(),
                fill.getLabelerName(),
                fill.getStatus(),
                fill.getCurrentRoundNo(),
                fill.getTaskTitle(),
                fill.getTaskCode(),
                fill.getItemSeqNo(),
                fill.getSourceItemKey(),
                Objects.requireNonNullElse(fill.getPayloadPreview(), Map.of()),
                fill.getOwnerId(),
                fill.getOwnerName(),
                fill.getAssignmentStatus(),
                fill.getAssignmentAssignType(),
                fill.getAssignmentSlotNo(),
                fill.getAssignmentClaimedAt(),
                fill.getAssignmentDeadlineAt(),
                fill.getReviewerId(),
                fill.getReviewerName(),
                fill.getDraftPreviewText(),
                fill.getDraftSavedAt(),
                fill.getLastSubmittedAt(),
                fill.getCanWithdraw(),
                fill.getCanAppeal(),
                fill.getWithdrawBlockReason(),
                fill.getAppealBlockReason(),
                fill.getCreatedAt());
    }

    private String resolveTemplateSchemaJson(Long templateVersionId) {
        if (templateVersionId == null) {
            return null;
        }
        for (TemplateVersionEntity version :
                DisplayContainerBatchLoader.loadSoftDeleted(templateVersionMapper, List.of(templateVersionId))) {
            return FormSchemaRuntimeSanitizer.sanitizeForClient(objectMapper, version.getSchemaJson());
        }
        return null;
    }

    private SubmissionDetail toDetailRecord(
            SubmissionSummaryFill fill,
            Map<String, Object> draftData,
            Map<String, Object> extJson,
            String templateSchemaJson) {
        return new SubmissionDetail(
                fill.getId(),
                fill.getAssignmentId(),
                fill.getTaskId(),
                fill.getItemId(),
                fill.getLabelerId(),
                fill.getLabelerName(),
                fill.getStatus(),
                fill.getCurrentRoundNo(),
                fill.getTaskTitle(),
                fill.getTaskCode(),
                fill.getItemSeqNo(),
                fill.getSourceItemKey(),
                Objects.requireNonNullElse(fill.getPayloadPreview(), Map.of()),
                fill.getOwnerId(),
                fill.getOwnerName(),
                fill.getAssignmentStatus(),
                fill.getAssignmentAssignType(),
                fill.getAssignmentSlotNo(),
                fill.getAssignmentClaimedAt(),
                fill.getAssignmentDeadlineAt(),
                fill.getReviewerId(),
                fill.getReviewerName(),
                fill.getDraftPreviewText(),
                templateSchemaJson,
                draftData,
                fill.getDraftSavedAt(),
                fill.getSubmitCount(),
                fill.getLastSubmittedAt(),
                fill.getCanWithdraw(),
                fill.getCanAppeal(),
                fill.getWithdrawBlockReason(),
                fill.getAppealBlockReason(),
                extJson,
                submissionTimelineAssembler.buildSubmitHistory(fill.getId()),
                submissionTimelineAssembler.buildLifecycleTimeline(fill.getId(), fill.getAssignmentId()),
                fill.getCreatedAt());
    }
}
