package com.labelhub.infra.business.export.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.core.business.BusinessDtos.ExportJobCreateCommand;
import com.labelhub.core.business.BusinessDtos.ExportJobDownload;
import com.labelhub.core.business.BusinessDtos.ExportJobSummary;
import com.labelhub.core.business.ExportJobService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.business.export.support.ExportFormatSupport;
import com.labelhub.infra.business.export.support.ExportJobFilters;
import com.labelhub.infra.business.storage.service.MinioFileStorageService;
import com.labelhub.infra.persistence.entity.ExportJobEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.ExportJobMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
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
public class DbExportJobService implements ExportJobService {
    public static final String TASK_TYPE = "DATA_EXPORT";

    private final ExportJobMapper exportJobMapper;
    private final TaskMapper taskMapper;
    private final AsyncTaskService asyncTaskService;
    private final CurrentUserContext currentUserContext;
    private final MinioFileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    public DbExportJobService(ExportJobMapper exportJobMapper, TaskMapper taskMapper,
            AsyncTaskService asyncTaskService, CurrentUserContext currentUserContext,
            MinioFileStorageService fileStorageService, ObjectMapper objectMapper) {
        this.exportJobMapper = exportJobMapper;
        this.taskMapper = taskMapper;
        this.asyncTaskService = asyncTaskService;
        this.currentUserContext = currentUserContext;
        this.fileStorageService = fileStorageService;
        this.objectMapper = objectMapper;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    public PageResponse<ExportJobSummary> listExportJobs(Long taskId, ParsedListQuery query) {
        LambdaQueryWrapper<ExportJobEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ExportJobEntity::getDeletedFlag, 0);
        if (taskId != null) {
            wrapper.eq(ExportJobEntity::getTaskId, taskId);
        }
        wrapper.orderByDesc(ExportJobEntity::getCreatedAt);
        IPage<ExportJobEntity> pageResult = exportJobMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        List<ExportJobEntity> records = pageResult.getRecords();
        Map<Long, String> taskTitles = resolveTaskTitles(
                records.stream().map(ExportJobEntity::getTaskId).filter(Objects::nonNull).collect(Collectors.toSet()));
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                records.stream().map(e -> toSummary(e, taskTitles.get(e.getTaskId()))).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    public ExportJobSummary getExportJob(Long id) {
        return toSummary(loadJob(id));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    @Audit(entityType = "EXPORT_JOB", actionCode = "export.create", entityId = "#result.id()", after = com.labelhub.core.audit.AuditSnapshotSource.RESULT)
    public ExportJobSummary createExportJob(ExportJobCreateCommand command) {
        String format = command.exportFormat() == null ? "" : command.exportFormat().toUpperCase();
        TaskEntity task = taskMapper.selectById(command.taskId());
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }

        ExportJobEntity e = new ExportJobEntity();
        e.setTaskId(command.taskId());
        e.setBizType("APPROVED_DATA");
        e.setRequestedBy(currentUserContext.userIdOrZero());
        Map<String, Object> filterMap = ExportJobFilters.coerceRawFilter(command.filterConditionsJson(), objectMapper);
        ExportJobFilters filters = ExportJobFilters.fromMap(filterMap);
        e.setExportScope(filters.exportScope());
        e.setTemplateScope("BOUND_VERSION");
        e.setFormatCode(format);
        e.setStatus("PENDING");
        e.setProgressPercent(0);
        e.setTotalRecords(0);
        e.setExportedRecords(0);
        List<String> fieldMappings = command.fieldMappings() == null ? List.of() : command.fieldMappings();
        boolean includeReview = fieldMappings.stream().anyMatch(key -> key.startsWith("review."));
        e.setIncludeReviewFlag(includeReview ? 1 : 0);
        e.setIncludeAiReviewFlag(
                fieldMappings.stream().anyMatch(key -> key.startsWith("review.lastAi")) ? 1 : 0);
        e.setFiltersJson(writeJsonOr(filterMap, "{}"));
        e.setFieldMapJson(writeJsonOr(fieldMappings, "[]"));
        e.setExtJson(writeJsonOr(Map.of("jobName", command.jobName() == null ? "" : command.jobName()), "{}"));
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        exportJobMapper.insert(e);

        asyncTaskService.enqueue(TASK_TYPE, "EXPORT_JOB", e.getId(), "export:" + e.getId(), 5,
                Map.of("exportJobId", e.getId()));
        return toSummary(e);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    public ExportJobDownload downloadExportJob(Long id) {
        ExportJobEntity e = loadJob(id);
        if (!"SUCCESS".equals(e.getStatus()) || e.getResultFileId() == null) {
            throw new BusinessException(ErrorCode.EXPORT_NOT_READY, "导出尚未完成或结果文件缺失");
        }
        byte[] content = fileStorageService.download(e.getResultFileId());
        return new ExportJobDownload(buildFileName(e), contentTypeFor(e.getFormatCode()), content);
    }

    private ExportJobEntity loadJob(Long id) {
        ExportJobEntity e = exportJobMapper.selectById(id);
        if (e == null || e.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.EXPORT_JOB_NOT_FOUND, "Export job not found");
        }
        return e;
    }

    private String writeJsonOr(Object value, String fallback) {
        try {
            return objectMapper.writeValueAsString(value != null ? value : fallback);
        } catch (Exception ex) {
            return fallback;
        }
    }

    private String resolveJobName(ExportJobEntity e) {
        if (e.getExtJson() == null || e.getExtJson().isBlank()) {
            return "export-" + e.getId();
        }
        try {
            Map<String, Object> ext = objectMapper.readValue(e.getExtJson(), new TypeReference<>() {});
            Object name = ext.get("jobName");
            if (name != null && !name.toString().isBlank()) {
                return name.toString();
            }
        } catch (Exception ignored) {
        }
        return "export-" + e.getId();
    }

    private String buildFileName(ExportJobEntity e) {
        String base = resolveJobName(e).replaceAll("[^a-zA-Z0-9_\\-]", "_");
        return base + ExportFormatSupport.extensionFor(e.getFormatCode());
    }

    private String contentTypeFor(String format) {
        return switch (format) {
            case "JSON", "JSONL" -> "application/json";
            default -> "text/csv";
        };
    }

    private ExportJobSummary toSummary(ExportJobEntity e) {
        return toSummary(e, resolveTaskTitle(e.getTaskId()));
    }

    private ExportJobSummary toSummary(ExportJobEntity e, String taskTitle) {
        return new ExportJobSummary(
                e.getId(),
                e.getTaskId(),
                resolveJobName(e),
                e.getFormatCode(),
                e.getStatus(),
                e.getProgressPercent() != null ? e.getProgressPercent() : 0,
                e.getTotalRecords() != null ? e.getTotalRecords().longValue() : 0L,
                e.getCreatedAt(),
                taskTitle);
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
