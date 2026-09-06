package com.labelhub.infra.business.acceptance.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.core.business.AcceptanceService;
import com.labelhub.core.business.BusinessDtos.AcceptanceCreateCommand;
import com.labelhub.core.business.BusinessDtos.AcceptanceSampleRow;
import com.labelhub.core.business.BusinessDtos.AcceptanceSummary;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskAcceptanceRecordEntity;
import com.labelhub.infra.persistence.entity.TaskAcceptanceSampleEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.business.display.assembler.AcceptanceSampleDisplayAssembler;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskAcceptanceRecordMapper;
import com.labelhub.infra.persistence.mapper.TaskAcceptanceSampleMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbAcceptanceService implements AcceptanceService {
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_SAMPLING = "SAMPLING";
    private static final String STATUS_CONFIRMED = "CONFIRMED";
    private static final String STATUS_REOPENED = "REOPENED";

    private final TaskAcceptanceRecordMapper recordMapper;
    private final TaskAcceptanceSampleMapper sampleMapper;
    private final SubmissionMapper submissionMapper;
    private final TaskMapper taskMapper;
    private final CurrentUserContext currentUserContext;
    private final ObjectMapper objectMapper;
    private final AcceptanceSampleDisplayAssembler sampleDisplayAssembler;

    public DbAcceptanceService(TaskAcceptanceRecordMapper recordMapper, TaskAcceptanceSampleMapper sampleMapper,
            SubmissionMapper submissionMapper, TaskMapper taskMapper, CurrentUserContext currentUserContext,
            ObjectMapper objectMapper, AcceptanceSampleDisplayAssembler sampleDisplayAssembler) {
        this.recordMapper = recordMapper;
        this.sampleMapper = sampleMapper;
        this.submissionMapper = submissionMapper;
        this.taskMapper = taskMapper;
        this.currentUserContext = currentUserContext;
        this.objectMapper = objectMapper;
        this.sampleDisplayAssembler = sampleDisplayAssembler;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public PageResponse<AcceptanceSummary> listAcceptances(Long taskId, ParsedListQuery query) {
        LambdaQueryWrapper<TaskAcceptanceRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskAcceptanceRecordEntity::getDeletedFlag, 0);
        if (taskId != null) {
            wrapper.eq(TaskAcceptanceRecordEntity::getTaskId, taskId);
        }
        wrapper.orderByDesc(TaskAcceptanceRecordEntity::getCreatedAt);
        IPage<TaskAcceptanceRecordEntity> pageResult = recordMapper.selectPage(
                new Page<>(query.page(), query.pageSize()), wrapper);
        List<TaskAcceptanceRecordEntity> records = pageResult.getRecords();
        Map<Long, String> taskTitles = resolveTaskTitles(
                records.stream().map(TaskAcceptanceRecordEntity::getTaskId).filter(Objects::nonNull).collect(Collectors.toSet()));
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                records.stream().map(e -> toSummary(e, taskTitles.get(e.getTaskId()))).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public AcceptanceSummary getAcceptance(Long id) {
        return toSummary(loadRecord(id));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    @Audit(entityType = "ACCEPTANCE", actionCode = "acceptance.create", entityId = "#result.id()", after = com.labelhub.core.audit.AuditSnapshotSource.RESULT)
    public AcceptanceSummary createAcceptance(AcceptanceCreateCommand command) {
        TaskEntity task = taskMapper.selectById(command.taskId());
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        String mode = command.sampleMode() != null ? command.sampleMode() : "RATIO";
        TaskAcceptanceRecordEntity e = new TaskAcceptanceRecordEntity();
        e.setTaskId(command.taskId());
        e.setAcceptanceType("FINAL_CONFIRM");
        e.setAcceptedBy(currentUserContext.userIdOrZero());
        e.setStatus(STATUS_PENDING);
        e.setSampleRuleJson(writeSampleRule(mode, command.sampleValue()));
        e.setSampleTotalCount(0);
        e.setSampledCount(0);
        e.setPassCount(0);
        e.setFailedCount(0);
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        recordMapper.insert(e);
        return toSummary(e);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    @Audit(entityType = "ACCEPTANCE", actionCode = "acceptance.generateSamples", entityId = "#acceptanceId")
    public AcceptanceSummary generateSamples(Long acceptanceId) {
        TaskAcceptanceRecordEntity record = loadRecord(acceptanceId);
        if (STATUS_CONFIRMED.equals(record.getStatus())) {
            throw new BusinessException(ErrorCode.ACCEPTANCE_STATUS_INVALID, "已确认的验收单不可重新抽样");
        }
        // 清理旧样本（重抽）
        sampleMapper.delete(new LambdaQueryWrapper<TaskAcceptanceSampleEntity>()
                .eq(TaskAcceptanceSampleEntity::getAcceptanceId, acceptanceId));

        List<SubmissionEntity> approved = submissionMapper.selectList(new LambdaQueryWrapper<SubmissionEntity>()
                .eq(SubmissionEntity::getTaskId, record.getTaskId())
                .eq(SubmissionEntity::getDeletedFlag, 0)
                .eq(SubmissionEntity::getCurrentStatus, "APPROVED")
                .orderByAsc(SubmissionEntity::getId));

        int sampleSize = resolveSampleSize(record.getSampleRuleJson(), approved.size());
        List<SubmissionEntity> picked = pickByStep(approved, sampleSize);

        int created = 0;
        for (SubmissionEntity s : picked) {
            if (s.getCurrentVersionId() == null) {
                continue;
            }
            TaskAcceptanceSampleEntity sample = new TaskAcceptanceSampleEntity();
            sample.setAcceptanceId(acceptanceId);
            sample.setTaskId(record.getTaskId());
            sample.setSubmissionId(s.getId());
            sample.setSubmissionVersionId(s.getCurrentVersionId());
            sample.setAssignmentId(s.getAssignmentId());
            sample.setLabelerId(s.getLabelerId());
            sample.setSampleSource("AUTO");
            sample.setSampleStatus("PENDING");
            sample.setCreatedAt(Instant.now());
            sample.setUpdatedAt(Instant.now());
            sampleMapper.insert(sample);
            created++;
        }

        record.setStatus(STATUS_SAMPLING);
        record.setSampleTotalCount(created);
        record.setSampledCount(0);
        record.setPassCount(0);
        record.setFailedCount(0);
        record.setUpdatedAt(Instant.now());
        recordMapper.updateById(record);
        return toSummary(record);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public PageResponse<AcceptanceSampleRow> listSamples(Long acceptanceId, ParsedListQuery query) {
        LambdaQueryWrapper<TaskAcceptanceSampleEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskAcceptanceSampleEntity::getDeletedFlag, 0)
                .eq(TaskAcceptanceSampleEntity::getAcceptanceId, acceptanceId)
                .orderByAsc(TaskAcceptanceSampleEntity::getId);
        IPage<TaskAcceptanceSampleEntity> pageResult = sampleMapper.selectPage(
                new Page<>(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                sampleDisplayAssembler.assemble(pageResult.getRecords()));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public AcceptanceSampleRow getSample(Long acceptanceId, Long sampleId) {
        TaskAcceptanceSampleEntity sample = sampleMapper.selectById(sampleId);
        if (sample == null || sample.getDeletedFlag() == 1
                || !acceptanceId.equals(sample.getAcceptanceId())) {
            throw new BusinessException(ErrorCode.ACCEPTANCE_SAMPLE_NOT_FOUND, "样本不存在");
        }
        return sampleDisplayAssembler.assemble(sample);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    @Audit(entityType = "ACCEPTANCE", actionCode = "acceptance.decideSample", entityId = "#sampleId")
    public AcceptanceSummary decideSample(Long sampleId, String decision, String comment) {
        if (!"PASS".equals(decision) && !"FAIL".equals(decision)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "decision 必须为 PASS 或 FAIL");
        }
        TaskAcceptanceSampleEntity sample = sampleMapper.selectById(sampleId);
        if (sample == null || sample.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ACCEPTANCE_SAMPLE_NOT_FOUND, "样本不存在");
        }
        boolean firstCheck = !"CHECKED".equals(sample.getSampleStatus());
        String prevDecision = sample.getOwnerDecision();

        sample.setSampleStatus("CHECKED");
        sample.setOwnerDecision(decision);
        sample.setOwnerCommentText(comment);
        sample.setCheckedAt(Instant.now());
        sample.setUpdatedAt(Instant.now());
        sampleMapper.updateById(sample);

        TaskAcceptanceRecordEntity record = loadRecord(sample.getAcceptanceId());
        if (firstCheck) {
            record.setSampledCount(nz(record.getSampledCount()) + 1);
            if ("PASS".equals(decision)) {
                record.setPassCount(nz(record.getPassCount()) + 1);
            } else {
                record.setFailedCount(nz(record.getFailedCount()) + 1);
            }
        } else if (prevDecision != null && !prevDecision.equals(decision)) {
            // 改判：调整 pass/fail 计数
            if ("PASS".equals(decision)) {
                record.setPassCount(nz(record.getPassCount()) + 1);
                record.setFailedCount(Math.max(0, nz(record.getFailedCount()) - 1));
            } else {
                record.setFailedCount(nz(record.getFailedCount()) + 1);
                record.setPassCount(Math.max(0, nz(record.getPassCount()) - 1));
            }
        }
        record.setUpdatedAt(Instant.now());
        recordMapper.updateById(record);
        return toSummary(record);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    @Audit(entityType = "ACCEPTANCE", actionCode = "acceptance.confirm", entityId = "#acceptanceId")
    public AcceptanceSummary confirmAcceptance(Long acceptanceId, String comment) {
        TaskAcceptanceRecordEntity record = loadRecord(acceptanceId);
        if (!STATUS_SAMPLING.equals(record.getStatus()) && !STATUS_REOPENED.equals(record.getStatus())) {
            throw new BusinessException(ErrorCode.ACCEPTANCE_STATUS_INVALID, "仅抽样中或重开状态可确认");
        }
        record.setStatus(STATUS_CONFIRMED);
        record.setCommentText(comment);
        record.setConfirmedAt(Instant.now());
        record.setUpdatedAt(Instant.now());
        recordMapper.updateById(record);

        TaskEntity task = taskMapper.selectById(record.getTaskId());
        if (task != null && task.getDeletedFlag() == 0) {
            task.setAcceptanceStatus(STATUS_CONFIRMED);
            task.setLatestAcceptanceId(record.getId());
            task.setUpdatedAt(Instant.now());
            taskMapper.updateById(task);
        }
        return toSummary(record);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    @Audit(entityType = "ACCEPTANCE", actionCode = "acceptance.reopen", entityId = "#acceptanceId")
    public AcceptanceSummary reopenAcceptance(Long acceptanceId) {
        TaskAcceptanceRecordEntity record = loadRecord(acceptanceId);
        if (!STATUS_CONFIRMED.equals(record.getStatus())) {
            throw new BusinessException(ErrorCode.ACCEPTANCE_STATUS_INVALID, "仅已确认验收单可重开");
        }
        record.setStatus(STATUS_REOPENED);
        record.setReopenedAt(Instant.now());
        record.setUpdatedAt(Instant.now());
        recordMapper.updateById(record);
        return toSummary(record);
    }

    /** 按 id 升序步长抽样：可复现、均匀覆盖，避免 ORDER BY RAND() 全表排序。 */
    private List<SubmissionEntity> pickByStep(List<SubmissionEntity> approved, int sampleSize) {
        if (approved.isEmpty() || sampleSize <= 0) {
            return List.of();
        }
        if (sampleSize >= approved.size()) {
            return approved;
        }
        int step = Math.max(1, approved.size() / sampleSize);
        List<SubmissionEntity> picked = new java.util.ArrayList<>(sampleSize);
        for (int i = 0; i < approved.size() && picked.size() < sampleSize; i += step) {
            picked.add(approved.get(i));
        }
        return picked;
    }

    private int resolveSampleSize(String sampleRuleJson, int approvedTotal) {
        if (approvedTotal == 0) {
            return 0;
        }
        try {
            Map<String, Object> rule = objectMapper.readValue(sampleRuleJson,
                    new com.fasterxml.jackson.core.type.TypeReference<>() {});
            String mode = String.valueOf(rule.getOrDefault("mode", "RATIO"));
            BigDecimal value = new BigDecimal(String.valueOf(rule.getOrDefault("value", "0")));
            if ("FIXED".equals(mode)) {
                return Math.min(value.intValue(), approvedTotal);
            }
            // RATIO：ceil(total * ratio)
            int size = value.multiply(BigDecimal.valueOf(approvedTotal))
                    .setScale(0, java.math.RoundingMode.CEILING).intValue();
            return Math.min(Math.max(size, 0), approvedTotal);
        } catch (Exception ex) {
            return 0;
        }
    }

    private String writeSampleRule(String mode, BigDecimal value) {
        try {
            return objectMapper.writeValueAsString(Map.of("mode", mode, "value", value != null ? value : BigDecimal.ZERO));
        } catch (Exception ex) {
            return "{\"mode\":\"RATIO\",\"value\":0}";
        }
    }

    private TaskAcceptanceRecordEntity loadRecord(Long id) {
        TaskAcceptanceRecordEntity e = recordMapper.selectById(id);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ACCEPTANCE_NOT_FOUND, "验收单不存在");
        }
        return e;
    }

    private int nz(Integer v) {
        return v == null ? 0 : v;
    }

    private AcceptanceSummary toSummary(TaskAcceptanceRecordEntity e) {
        return toSummary(e, resolveTaskTitle(e.getTaskId()));
    }

    private AcceptanceSummary toSummary(TaskAcceptanceRecordEntity e, String taskTitle) {
        return new AcceptanceSummary(e.getId(), e.getTaskId(), e.getAcceptanceType(), e.getStatus(),
                e.getSampleTotalCount(), e.getSampledCount(), e.getPassCount(), e.getFailedCount(),
                e.getCommentText(), e.getConfirmedAt(), e.getCreatedAt(), taskTitle);
    }

    private Map<Long, String> resolveTaskTitles(Collection<Long> taskIds) {
        if (taskIds == null || taskIds.isEmpty()) {
            return Map.of();
        }
        return taskMapper.selectBatchIds(taskIds).stream()
                .filter(t -> t.getDeletedFlag() == null || t.getDeletedFlag() == 0)
                .collect(Collectors.toMap(TaskEntity::getId, TaskEntity::getTitle, (left, right) -> left));
    }

    private String resolveTaskTitle(Long taskId) {
        if (taskId == null) {
            return null;
        }
        return resolveTaskTitles(List.of(taskId)).get(taskId);
    }

}
