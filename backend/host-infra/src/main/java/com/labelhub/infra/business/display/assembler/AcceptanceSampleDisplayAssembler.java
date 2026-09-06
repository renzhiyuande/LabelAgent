package com.labelhub.infra.business.display.assembler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.AcceptanceSampleRow;
import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.infra.business.display.FormSchemaDraftPreviewSupport;
import com.labelhub.infra.business.display.support.FormSchemaRuntimeSanitizer;
import com.labelhub.infra.business.display.TaskPayloadPreviewSupport;
import com.labelhub.infra.business.display.container.DisplayContainerBatchLoader;
import com.labelhub.infra.business.submission.support.SubmissionVersionReader;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.SubmissionVersionEntity;
import com.labelhub.infra.persistence.entity.TaskAcceptanceSampleEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.SubmissionVersionMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AcceptanceSampleDisplayAssembler {
    private final SubmissionSummaryAssembler submissionSummaryAssembler;
    private final SubmissionMapper submissionMapper;
    private final SubmissionVersionMapper submissionVersionMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final SubmissionVersionReader submissionVersionReader;
    private final TaskItemMapper taskItemMapper;
    private final ObjectMapper objectMapper;

    public AcceptanceSampleDisplayAssembler(
            SubmissionSummaryAssembler submissionSummaryAssembler,
            SubmissionMapper submissionMapper,
            SubmissionVersionMapper submissionVersionMapper,
            TemplateVersionMapper templateVersionMapper,
            SubmissionVersionReader submissionVersionReader,
            TaskItemMapper taskItemMapper,
            ObjectMapper objectMapper) {
        this.submissionSummaryAssembler = submissionSummaryAssembler;
        this.submissionMapper = submissionMapper;
        this.submissionVersionMapper = submissionVersionMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.submissionVersionReader = submissionVersionReader;
        this.taskItemMapper = taskItemMapper;
        this.objectMapper = objectMapper;
    }

    public List<AcceptanceSampleRow> assemble(List<TaskAcceptanceSampleEntity> samples) {
        return assemble(samples, false);
    }

    public AcceptanceSampleRow assemble(TaskAcceptanceSampleEntity sample) {
        return assemble(List.of(sample), true).get(0);
    }

    public List<AcceptanceSampleRow> assemble(List<TaskAcceptanceSampleEntity> samples, boolean includeDetailPayload) {
        if (samples == null || samples.isEmpty()) {
            return List.of();
        }
        Map<Long, SubmissionSummary> summaryBySubmissionId = loadSubmissionSummaries(samples);
        Map<Long, SubmissionVersionEntity> versionById = loadVersions(samples);
        Map<Long, String> schemaByTemplateVersionId = loadSchemaByTemplateVersionId(versionById.values());
        Map<Long, Map<String, Object>> itemPayloadByItemId = includeDetailPayload
                ? loadItemPayloads(summaryBySubmissionId.values())
                : Map.of();

        return samples.stream()
                .map(sample -> toRow(
                        sample,
                        summaryBySubmissionId.get(sample.getSubmissionId()),
                        versionById.get(sample.getSubmissionVersionId()),
                        schemaByTemplateVersionId,
                        itemPayloadByItemId,
                        includeDetailPayload))
                .toList();
    }

    private Map<Long, Map<String, Object>> loadItemPayloads(Iterable<SubmissionSummary> submissions) {
        Set<Long> itemIds = new LinkedHashSet<>();
        for (SubmissionSummary submission : submissions) {
            if (submission != null && submission.itemId() != null) {
                itemIds.add(submission.itemId());
            }
        }
        if (itemIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Map<String, Object>> payloadByItemId = new HashMap<>();
        for (TaskItemEntity item : DisplayContainerBatchLoader.loadSoftDeleted(taskItemMapper, itemIds)) {
            payloadByItemId.put(
                    item.getId(),
                    TaskPayloadPreviewSupport.toPayloadMap(objectMapper, item.getPayloadJson()));
        }
        return payloadByItemId;
    }

    private Map<Long, SubmissionSummary> loadSubmissionSummaries(List<TaskAcceptanceSampleEntity> samples) {
        Set<Long> submissionIds = samples.stream()
                .map(TaskAcceptanceSampleEntity::getSubmissionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (submissionIds.isEmpty()) {
            return Map.of();
        }
        List<SubmissionEntity> submissions = DisplayContainerBatchLoader.loadSoftDeleted(submissionMapper,
                submissionIds);
        return submissionSummaryAssembler.assemble(submissions).stream()
                .collect(Collectors.toMap(SubmissionSummary::id, Function.identity(), (a, b) -> a, HashMap::new));
    }

    private Map<Long, SubmissionVersionEntity> loadVersions(List<TaskAcceptanceSampleEntity> samples) {
        Set<Long> versionIds = samples.stream()
                .map(TaskAcceptanceSampleEntity::getSubmissionVersionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (versionIds.isEmpty()) {
            return Map.of();
        }
        return DisplayContainerBatchLoader.loadSoftDeleted(submissionVersionMapper, versionIds).stream()
                .collect(Collectors.toMap(SubmissionVersionEntity::getId, Function.identity(), (a, b) -> a,
                        HashMap::new));
    }

    private Map<Long, String> loadSchemaByTemplateVersionId(Iterable<SubmissionVersionEntity> versions) {
        Set<Long> templateVersionIds = new LinkedHashSet<>();
        for (SubmissionVersionEntity version : versions) {
            if (version.getTemplateVersionId() != null) {
                templateVersionIds.add(version.getTemplateVersionId());
            }
        }
        if (templateVersionIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> schemaByTemplateVersionId = new HashMap<>();
        for (TemplateVersionEntity templateVersion : DisplayContainerBatchLoader.loadSoftDeleted(templateVersionMapper,
                templateVersionIds)) {
            schemaByTemplateVersionId.put(templateVersion.getId(), templateVersion.getSchemaJson());
        }
        return schemaByTemplateVersionId;
    }

    private AcceptanceSampleRow toRow(
            TaskAcceptanceSampleEntity sample,
            SubmissionSummary submission,
            SubmissionVersionEntity version,
            Map<Long, String> schemaByTemplateVersionId,
            Map<Long, Map<String, Object>> itemPayloadByItemId,
            boolean includeDetailPayload) {
        String submitPreviewText = null;
        Map<String, Object> submitData = null;
        String templateSchemaJson = null;
        if (version != null) {
            String schemaJson = schemaByTemplateVersionId.get(version.getTemplateVersionId());
            submitPreviewText = FormSchemaDraftPreviewSupport.toPreviewText(
                    objectMapper, schemaJson, version.getSubmitDataJson());
            if (includeDetailPayload) {
                submitData = submissionVersionReader.readSubmitDataByVersionId(version.getId());
                templateSchemaJson = FormSchemaRuntimeSanitizer.sanitizeForClient(objectMapper, schemaJson);
            }
        }
        return new AcceptanceSampleRow(
                sample.getId(),
                sample.getAcceptanceId(),
                sample.getTaskId(),
                sample.getSubmissionId(),
                sample.getSubmissionVersionId(),
                sample.getLabelerId(),
                sample.getSampleSource(),
                sample.getSampleStatus(),
                sample.getOwnerDecision(),
                sample.getOwnerCommentText(),
                sample.getCheckedAt(),
                submission != null ? submission.itemId() : null,
                sample.getAssignmentId() != null ? sample.getAssignmentId()
                        : submission != null ? submission.assignmentId() : null,
                submission != null ? submission.sourceItemKey() : null,
                submission != null ? submission.itemSeqNo() : null,
                submission != null ? submission.payloadPreview() : Map.of(),
                resolveItemPayload(submission, itemPayloadByItemId, includeDetailPayload),
                submission != null ? submission.labelerName() : null,
                submission != null ? submission.status() : null,
                submission != null ? submission.currentRoundNo() : null,
                submitPreviewText,
                submitData,
                templateSchemaJson);
    }

    private Map<String, Object> resolveItemPayload(
            SubmissionSummary submission,
            Map<Long, Map<String, Object>> itemPayloadByItemId,
            boolean includeDetailPayload) {
        if (!includeDetailPayload || submission == null || submission.itemId() == null) {
            return Map.of();
        }
        return Objects.requireNonNullElse(itemPayloadByItemId.get(submission.itemId()), Map.of());
    }
}
