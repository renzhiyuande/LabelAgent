package com.labelhub.infra.business.display.assembler;

import cn.crane4j.core.support.Crane4jTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.labelhub.core.business.BusinessDtos.AssignmentDetail;
import com.labelhub.core.business.BusinessDtos.AssignmentSummary;
import com.labelhub.infra.business.display.TaskPayloadPreviewSupport;
import com.labelhub.infra.business.display.fill.AssignmentDetailFill;
import com.labelhub.infra.business.display.fill.AssignmentSummaryFill;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AssignmentSummaryAssembler {
    private final Crane4jTemplate crane4jTemplate;
    private final ObjectMapper objectMapper;
    private final UserDisplayNameResolver userDisplayNameResolver;
    private final SubmissionTimelineAssembler submissionTimelineAssembler;

    public AssignmentSummaryAssembler(
            Crane4jTemplate crane4jTemplate,
            ObjectMapper objectMapper,
            UserDisplayNameResolver userDisplayNameResolver,
            SubmissionTimelineAssembler submissionTimelineAssembler) {
        this.crane4jTemplate = crane4jTemplate;
        this.objectMapper = objectMapper;
        this.userDisplayNameResolver = userDisplayNameResolver;
        this.submissionTimelineAssembler = submissionTimelineAssembler;
    }

    public AssignmentSummary assemble(AssignmentEntity entity) {
        if (entity == null) {
            return null;
        }
        return assemble(List.of(entity)).get(0);
    }

    public List<AssignmentSummary> assemble(List<AssignmentEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return List.of();
        }
        List<AssignmentSummaryFill> fills = entities.stream().map(this::toFill).toList();
        crane4jTemplate.execute(fills);
        fills.forEach(this::applyPayloadPreview);
        return fills.stream().map(this::toRecord).toList();
    }

    public String resolveLabelerName(Long labelerId) {
        return labelerId != null ? userDisplayNameResolver.resolve(labelerId) : null;
    }

    public AssignmentDetail assembleDetail(AssignmentEntity entity) {
        if (entity == null) {
            return null;
        }
        AssignmentDetailFill fill = toDetailFill(entity);
        crane4jTemplate.execute(List.of(fill));
        applyPayloadPreview(fill);
        return toDetailRecord(fill, entity);
    }

    private AssignmentSummaryFill toFill(AssignmentEntity entity) {
        AssignmentSummaryFill fill = new AssignmentSummaryFill();
        fill.setId(entity.getId());
        fill.setTaskId(entity.getTaskId());
        fill.setItemId(entity.getItemId());
        fill.setSlotNo(entity.getSlotNo());
        fill.setLabelerId(entity.getLabelerId());
        fill.setAssignType(entity.getAssignType());
        fill.setStatus(entity.getStatus());
        fill.setAssignedAt(entity.getAssignedAt());
        fill.setClaimedAt(entity.getClaimedAt());
        fill.setDeadlineAt(entity.getDeadlineAt());
        fill.setCreatedAt(entity.getCreatedAt());
        return fill;
    }

    private AssignmentDetailFill toDetailFill(AssignmentEntity entity) {
        AssignmentDetailFill fill = new AssignmentDetailFill();
        fill.setId(entity.getId());
        fill.setTaskId(entity.getTaskId());
        fill.setItemId(entity.getItemId());
        fill.setSlotNo(entity.getSlotNo());
        fill.setLabelerId(entity.getLabelerId());
        fill.setAssignType(entity.getAssignType());
        fill.setStatus(entity.getStatus());
        fill.setAssignedAt(entity.getAssignedAt());
        fill.setClaimedAt(entity.getClaimedAt());
        fill.setDeadlineAt(entity.getDeadlineAt());
        fill.setCreatedAt(entity.getCreatedAt());
        fill.setClaimSource(entity.getClaimSource());
        fill.setCurrentRoundNo(entity.getCurrentRoundNo());
        fill.setExtJson(readExtJson(entity.getExtJson()));
        return fill;
    }

    private Map<String, Object> readExtJson(String rawJson) {
        if (rawJson == null) {
            return null;
        }
        try {
            return objectMapper.readValue(rawJson, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private void applyPayloadPreview(AssignmentSummaryFill fill) {
        fill.setPayloadPreview(
                TaskPayloadPreviewSupport.toPayloadPreview(objectMapper, fill.getItemPayloadJson()));
    }

    private AssignmentSummary toRecord(AssignmentSummaryFill fill) {
        return new AssignmentSummary(
                fill.getId(),
                fill.getTaskId(),
                fill.getItemId(),
                fill.getSlotNo(),
                fill.getLabelerId(),
                fill.getLabelerName(),
                fill.getAssignType(),
                fill.getStatus(),
                fill.getTaskTitle(),
                fill.getTaskCode(),
                fill.getItemSeqNo(),
                fill.getSourceItemKey(),
                Objects.requireNonNullElse(fill.getPayloadPreview(), java.util.Map.of()),
                fill.getAssignedAt(),
                fill.getClaimedAt(),
                fill.getDeadlineAt(),
                fill.getCreatedAt());
    }

    private AssignmentDetail toDetailRecord(AssignmentDetailFill fill, AssignmentEntity entity) {
        return new AssignmentDetail(
                fill.getId(),
                fill.getTaskId(),
                fill.getItemId(),
                fill.getSlotNo(),
                fill.getLabelerId(),
                fill.getLabelerName(),
                fill.getAssignType(),
                fill.getClaimSource(),
                fill.getStatus(),
                fill.getCurrentRoundNo(),
                fill.getTaskTitle(),
                fill.getTaskCode(),
                fill.getItemSeqNo(),
                fill.getSourceItemKey(),
                Objects.requireNonNullElse(fill.getPayloadPreview(), Map.of()),
                fill.getAssignedAt(),
                fill.getClaimedAt(),
                fill.getDeadlineAt(),
                fill.getExtJson(),
                submissionTimelineAssembler.buildAssignmentLifecycleTimeline(entity),
                fill.getCreatedAt());
    }
}
