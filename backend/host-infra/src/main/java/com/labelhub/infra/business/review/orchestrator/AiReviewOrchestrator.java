package com.labelhub.infra.business.review.orchestrator;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.review.AiReviewContext;
import com.labelhub.core.review.AiReviewEngine;
import com.labelhub.core.review.AiReviewResult;
import com.labelhub.infra.business.review.support.AiReviewMemoryRetriever;
import com.labelhub.infra.business.review.support.AiReviewRecordWriter;
import com.labelhub.infra.business.review.support.AiReviewVerdictMapper;
import com.labelhub.infra.business.submission.support.SubmissionVersionReader;
import com.labelhub.infra.business.submission.workflow.SubmissionReturnForRevisionLifecycle;
import com.labelhub.infra.business.submission.workflow.SubmissionStateMachineService;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.entity.TemplateReviewDimensionEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TemplateReviewDimensionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewOrchestrator {
    private static final Logger log = LoggerFactory.getLogger(AiReviewOrchestrator.class);

    private final SubmissionMapper submissionMapper;
    private final TaskItemMapper taskItemMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final TemplateReviewDimensionMapper templateReviewDimensionMapper;
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final SubmissionVersionReader submissionVersionReader;
    private final SubmissionStateMachineService submissionStateMachineService;
    private final SubmissionReturnForRevisionLifecycle submissionReturnForRevisionLifecycle;
    private final AiReviewEngine aiReviewEngine;
    private final AiReviewMemoryRetriever aiReviewMemoryRetriever;
    private final AiReviewRecordWriter aiReviewRecordWriter;
    private final ObjectMapper objectMapper;

    public AiReviewOrchestrator(
            SubmissionMapper submissionMapper,
            TaskItemMapper taskItemMapper,
            TemplateVersionMapper templateVersionMapper,
            TemplateReviewDimensionMapper templateReviewDimensionMapper,
            AiReviewRecordMapper aiReviewRecordMapper,
            SubmissionVersionReader submissionVersionReader,
            SubmissionStateMachineService submissionStateMachineService,
            SubmissionReturnForRevisionLifecycle submissionReturnForRevisionLifecycle,
            AiReviewEngine aiReviewEngine,
            AiReviewMemoryRetriever aiReviewMemoryRetriever,
            AiReviewRecordWriter aiReviewRecordWriter,
            ObjectMapper objectMapper) {
        this.submissionMapper = submissionMapper;
        this.taskItemMapper = taskItemMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.templateReviewDimensionMapper = templateReviewDimensionMapper;
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.submissionVersionReader = submissionVersionReader;
        this.submissionStateMachineService = submissionStateMachineService;
        this.submissionReturnForRevisionLifecycle = submissionReturnForRevisionLifecycle;
        this.aiReviewEngine = aiReviewEngine;
        this.aiReviewMemoryRetriever = aiReviewMemoryRetriever;
        this.aiReviewRecordWriter = aiReviewRecordWriter;
        this.objectMapper = objectMapper;
    }

    public void execute(Long submissionId, Long asyncTaskId) {
        SubmissionEntity entity = submissionMapper.selectById(submissionId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            log.warn("AI review orchestrator: submission {} not found", submissionId);
            return;
        }
        String currentStatus = entity.getCurrentStatus();
        if (!SubmissionStatus.AI_REVIEWING.name().equals(currentStatus)
                && !SubmissionStatus.AI_REVIEWING_APPEAL_HUMAN.name().equals(currentStatus)) {
            log.info("AI review orchestrator: submission {} status is {}, skip", submissionId, currentStatus);
            return;
        }

        TemplateVersionEntity version = templateVersionMapper.selectById(entity.getCurrentTemplateVersionId());
        if (version == null || version.getDeletedFlag() == 1) {
            throw new IllegalStateException("Template version not found for submission " + submissionId);
        }
        TaskItemEntity item = taskItemMapper.selectById(entity.getItemId());
        Map<String, Object> submitData = submissionVersionReader.readSubmitDataByVersionId(entity.getCurrentVersionId());
        Map<String, Object> itemPayload = readMap(item == null ? null : item.getPayloadJson());
        List<AiReviewContext.AiReviewDimensionSpec> dimensions = loadDimensionSpecs(version.getId());
        List<Map<String, Object>> memoryContext = aiReviewMemoryRetriever.loadRecentCases(version.getId(), entity.getId());
        int retryNo = countExistingReviews(entity.getCurrentVersionId());

        AiReviewContext context = new AiReviewContext(
                entity.getId(),
                entity.getCurrentVersionId(),
                entity.getTaskId(),
                entity.getAssignmentId(),
                entity.getCurrentRoundNo(),
                version.getProviderPlatformKey(),
                version.getModelId(),
                version.getReviewPromptTemplate(),
                version.getReviewOutputSchemaJson(),
                submitData,
                itemPayload,
                dimensions,
                memoryContext);

        AiReviewResult result;
        try {
            result = aiReviewEngine.review(context);
        } catch (Exception ex) {
            log.error("AI review engine failed for submission {}: {}", submissionId, ex.getMessage(), ex);
            handleEngineFailure(entity, version, asyncTaskId, retryNo, currentStatus, ex);
            return;
        }

        saveReviewResult(entity.getId(), entity.getCurrentVersionId(),
                entity.getTaskId(), entity.getAssignmentId(),
                entity.getCurrentRoundNo(), retryNo, asyncTaskId,
                version.getReviewOutputSchemaJson(), result,
                submissionId, result.verdict(), currentStatus);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveReviewResult(Long submissionId, Long versionId, Long taskId,
            Long assignmentId, Integer roundNo, int retryNo, Long asyncTaskId,
            String outputSchemaJson, AiReviewResult result,
            Long entityId, String verdict, String currentStatus) {
        AiReviewRecordEntity record = aiReviewRecordWriter.writeSuccess(
                submissionId, versionId, taskId, assignmentId, roundNo,
                retryNo, asyncTaskId, outputSchemaJson, result);
        SubmissionEntity entity = submissionMapper.selectById(entityId);
        entity.setLastAiReviewId(record.getId());
        entity.setUpdatedAt(Instant.now());
        submissionMapper.updateById(entity);
        applyVerdictTransition(entityId, verdict, currentStatus);
        if (isRejectVerdict(verdict)) {
            submissionReturnForRevisionLifecycle.returnForRevisionIfAllowed(entityId, result.summary());
        }
    }

    private static boolean isRejectVerdict(String verdict) {
        return verdict != null && "REJECT".equalsIgnoreCase(verdict.trim());
    }

    private void handleEngineFailure(
            SubmissionEntity entity,
            TemplateVersionEntity version,
            Long asyncTaskId,
            int retryNo,
            String currentStatus,
            Exception ex) {
        AiReviewRecordEntity record = aiReviewRecordWriter.writeFailure(
                entity.getId(),
                entity.getCurrentVersionId(),
                entity.getTaskId(),
                entity.getAssignmentId(),
                entity.getCurrentRoundNo(),
                retryNo,
                asyncTaskId,
                version.getProviderPlatformKey(),
                version.getModelId(),
                version.getReviewOutputSchemaJson(),
                ex.getMessage());
        entity.setLastAiReviewId(record.getId());
        entity.setUpdatedAt(Instant.now());
        submissionMapper.updateById(entity);
        applyVerdictTransition(entity.getId(), "REQUIRE_HUMAN", currentStatus);
    }

    private void applyVerdictTransition(Long submissionId, String verdict, String currentStatus) {
        SubmissionEvent event = AiReviewVerdictMapper.toEvent(verdict, currentStatus);
        if (submissionStateMachineService.canTransition(submissionId, event)) {
            submissionStateMachineService.transition(submissionId, event);
            log.info("AI review orchestrator: submission {} transitioned via {}", submissionId, event);
        }
    }

    private List<AiReviewContext.AiReviewDimensionSpec> loadDimensionSpecs(Long templateVersionId) {
        LambdaQueryWrapper<TemplateReviewDimensionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateReviewDimensionEntity::getTemplateVersionId, templateVersionId)
                .orderByAsc(TemplateReviewDimensionEntity::getSortNo);
        return templateReviewDimensionMapper.selectList(wrapper).stream()
                .map(d -> new AiReviewContext.AiReviewDimensionSpec(
                        d.getDimensionKey(),
                        d.getDimensionName(),
                        d.getWeight(),
                        d.getScoreMin(),
                        d.getScoreMax(),
                        d.getPassThreshold(),
                        d.getRejectThreshold(),
                        d.getPromptInstruction()))
                .toList();
    }

    private int countExistingReviews(Long submissionVersionId) {
        LambdaQueryWrapper<AiReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewRecordEntity::getDeletedFlag, 0)
                .eq(AiReviewRecordEntity::getSubmissionVersionId, submissionVersionId);
        return aiReviewRecordMapper.selectCount(wrapper).intValue();
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse review payload JSON: {}", ex.getMessage());
            return Map.of();
        }
    }
}
