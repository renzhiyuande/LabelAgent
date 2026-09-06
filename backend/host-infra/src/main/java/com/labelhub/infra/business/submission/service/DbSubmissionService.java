package com.labelhub.infra.business.submission.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.SubmissionAttemptSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionDetail;
import com.labelhub.core.business.BusinessDtos.SubmissionDraftSaveCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionSubmitCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.core.business.SubmissionService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.form.TemplateSubmissionDataValidator;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.business.display.assembler.SubmissionSummaryAssembler;
import com.labelhub.infra.business.submission.support.SubmissionCurrentSupport;
import com.labelhub.infra.business.submission.support.SubmissionSupersedeReason;
import com.labelhub.infra.business.submission.workflow.SubmissionSubmitLifecycle;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.spec.SubmissionQuerySpec;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbSubmissionService implements SubmissionService {
    private static final Logger log = LoggerFactory.getLogger(DbSubmissionService.class);
    private final SubmissionMapper submissionMapper;
    private final AssignmentMapper assignmentMapper;
    private final SubmissionSubmitLifecycle submissionSubmitLifecycle;
    private final SubmissionCurrentSupport submissionCurrentSupport;
    private final MybatisQueryApplier queryApplier;
    private final ObjectMapper objectMapper;
    private final SubmissionSummaryAssembler summaryAssembler;
    private final TemplateSubmissionDataValidator templateSubmissionDataValidator;

    public DbSubmissionService(
            SubmissionMapper submissionMapper,
            AssignmentMapper assignmentMapper,
            SubmissionSubmitLifecycle submissionSubmitLifecycle,
            SubmissionCurrentSupport submissionCurrentSupport,
            MybatisQueryApplier queryApplier,
            ObjectMapper objectMapper,
            SubmissionSummaryAssembler summaryAssembler,
            TemplateSubmissionDataValidator templateSubmissionDataValidator) {
        this.submissionMapper = submissionMapper;
        this.assignmentMapper = assignmentMapper;
        this.submissionSubmitLifecycle = submissionSubmitLifecycle;
        this.submissionCurrentSupport = submissionCurrentSupport;
        this.queryApplier = queryApplier;
        this.objectMapper = objectMapper;
        this.summaryAssembler = summaryAssembler;
        this.templateSubmissionDataValidator = templateSubmissionDataValidator;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:assignment:read", "business:submission:read" })
    public PageResponse<SubmissionSummary> listSubmissions(ParsedListQuery query) {
        LambdaQueryWrapper<SubmissionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionEntity::getDeletedFlag, 0);
        queryApplier.apply(wrapper, query, SubmissionQuerySpec.build());
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(SubmissionEntity::getUpdatedAt);
        }
        IPage<SubmissionEntity> pageResult = submissionMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                summaryAssembler.assemble(pageResult.getRecords()));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:assignment:read", "business:submission:read" })
    public List<SubmissionAttemptSummary> listAttemptsByAssignment(Long assignmentId) {
        AssignmentEntity assignment = assignmentMapper.selectById(assignmentId);
        if (assignment == null || assignment.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        LambdaQueryWrapper<SubmissionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionEntity::getDeletedFlag, 0)
                .eq(SubmissionEntity::getAssignmentId, assignmentId)
                .orderByDesc(SubmissionEntity::getCreatedAt);
        return summaryAssembler.assembleAttempts(submissionMapper.selectList(wrapper));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:assignment:read", "business:submission:read" })
    public SubmissionDetail getSubmissionDetail(Long submissionId) {
        SubmissionEntity entity = submissionMapper.selectById(submissionId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        return summaryAssembler.assembleDetail(entity, readMap(entity.getDraftDataJson()), readMap(entity.getExtJson()));
    }

    @Override
    @Transactional
    @RequireAnyPermission({
            "system:admin",
            "business:assignment:update",
            "business:submission:update",
            "business:labeler:workbench"
    })
    @Audit(entityType = "SUBMISSION", actionCode = "submission.create_draft", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public SubmissionSummary createDraft(Long assignmentId) {
        AssignmentEntity assignment = assignmentMapper.selectById(assignmentId);
        if (assignment == null || assignment.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        SubmissionEntity entity = submissionCurrentSupport.ensureCurrentDraftForAssignment(
                assignment,
                SubmissionSupersedeReason.LABELER_CLAIMED.name());
        return summaryAssembler.assemble(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:update", "business:submission:update" })
    @Audit(entityType = "SUBMISSION", actionCode = "submission.save_draft", entityId = "#submissionId")
    public SubmissionSummary saveDraft(Long submissionId, SubmissionDraftSaveCommand command) {
        SubmissionEntity entity = submissionMapper.selectById(submissionId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        Map<String, Object> draftData = command.draftData();
        templateSubmissionDataValidator.sanitizeAnnotateSubmitData(entity.getCurrentTemplateVersionId(), draftData);
        entity.setDraftDataJson(writeJson(draftData));
        entity.setDraftSavedAt(Instant.now());
        entity.setLastActionCode(Boolean.TRUE.equals(command.autoSave()) ? "AUTO_SAVE_DRAFT" : "SAVE_DRAFT");
        entity.setLastActionAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        submissionMapper.updateById(entity);
        return summaryAssembler.assemble(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:update", "business:submission:update" })
    @Audit(entityType = "SUBMISSION", actionCode = "submission.submit", entityId = "#submissionId")
    public SubmissionSummary submit(Long submissionId, SubmissionSubmitCommand command) {
        SubmissionEntity entity = submissionMapper.selectById(submissionId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        entity = submissionSubmitLifecycle.submit(entity, command.finalSubmitData());
        return summaryAssembler.assemble(entity);
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            log.warn("Failed to parse JSON from submission: {}", ex.getMessage());
            return Map.of();
        }
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception ex) {
            log.warn("Failed to write JSON for submission: {}", ex.getMessage());
            return "{}";
        }
    }
}
