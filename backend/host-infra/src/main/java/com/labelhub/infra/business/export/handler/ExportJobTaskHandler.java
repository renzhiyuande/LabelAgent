package com.labelhub.infra.business.export.handler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.async.AsyncTaskHandler;
import com.labelhub.infra.business.export.service.DbExportJobService;
import com.labelhub.infra.business.export.support.ExportFieldDisplaySupport;
import com.labelhub.infra.business.export.support.ExportFormatSupport;
import com.labelhub.infra.business.export.support.ExportJobFilters;
import com.labelhub.infra.business.export.support.ExportSubmissionRowBuilder;
import com.labelhub.infra.business.storage.service.MinioFileStorageService;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.ExportJobEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.ExportJobMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 数据导出异步处理器。按导出范围读取任务下的提交记录，序列化为 JSON/JSONL/CSV，
 * 上传至 MinIO 对象存储并登记 file_assets，最后回写导出任务的状态、进度、记录数、
 * 校验和与 result_file_id。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ExportJobTaskHandler implements AsyncTaskHandler {
    private static final Logger log = LoggerFactory.getLogger(ExportJobTaskHandler.class);

    private final ExportJobMapper exportJobMapper;
    private final SubmissionMapper submissionMapper;
    private final TaskItemMapper taskItemMapper;
    private final ReviewRecordMapper reviewRecordMapper;
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final MinioFileStorageService fileStorageService;
    private final ExportFieldDisplaySupport exportFieldDisplaySupport;
    private final ObjectMapper objectMapper;

    public ExportJobTaskHandler(
            ExportJobMapper exportJobMapper,
            SubmissionMapper submissionMapper,
            TaskItemMapper taskItemMapper,
            ReviewRecordMapper reviewRecordMapper,
            AiReviewRecordMapper aiReviewRecordMapper,
            MinioFileStorageService fileStorageService,
            ExportFieldDisplaySupport exportFieldDisplaySupport,
            ObjectMapper objectMapper) {
        this.exportJobMapper = exportJobMapper;
        this.submissionMapper = submissionMapper;
        this.taskItemMapper = taskItemMapper;
        this.reviewRecordMapper = reviewRecordMapper;
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.fileStorageService = fileStorageService;
        this.exportFieldDisplaySupport = exportFieldDisplaySupport;
        this.objectMapper = objectMapper;
    }

    @Override
    public String taskType() {
        return DbExportJobService.TASK_TYPE;
    }

    @Override
    public void handle(AsyncTaskEntity task) {
        Long exportJobId = task.getBizId();
        ExportJobEntity job = exportJobMapper.selectById(exportJobId);
        if (job == null || job.getDeletedFlag() == 1) {
            log.warn("Export job not found, skip: {}", exportJobId);
            return;
        }
        if ("SUCCESS".equals(job.getStatus())) {
            return;
        }

        job.setStatus("RUNNING");
        job.setStartedAt(Instant.now());
        job.setProgressPercent(10);
        job.setUpdatedAt(Instant.now());
        exportJobMapper.updateById(job);

        try {
            ExportJobFilters filters = ExportJobFilters.fromJson(job.getFiltersJson(), objectMapper);
            List<SubmissionEntity> submissions = loadSubmissions(job.getTaskId(), filters);
            List<String> selectedFields = ExportSubmissionRowBuilder.resolveSelectedFields(job.getFieldMapJson(), objectMapper);
            String format = job.getFormatCode();
            byte[] content = serialize(format, job.getTaskId(), submissions, selectedFields);

            String fileName = "export-" + job.getId() + ExportFormatSupport.extensionFor(format);
            Long fileId = fileStorageService.upload(content, fileName, ExportFormatSupport.contentTypeFor(format),
                    "EXPORT_RESULT", job.getRequestedBy());

            job.setStatus("SUCCESS");
            job.setProgressPercent(100);
            job.setTotalRecords(submissions.size());
            job.setExportedRecords(submissions.size());
            job.setResultFileId(fileId);
            job.setChecksum(sha256Hex(content));
            job.setErrorMessage(null);
            job.setFinishedAt(Instant.now());
            job.setUpdatedAt(Instant.now());
            exportJobMapper.updateById(job);
        } catch (Exception ex) {
            log.error("Export job {} failed: {}", exportJobId, ex.getMessage(), ex);
            job.setStatus("FAILED");
            job.setErrorMessage(truncate(ex.getMessage()));
            job.setFinishedAt(Instant.now());
            job.setUpdatedAt(Instant.now());
            exportJobMapper.updateById(job);
            throw new RuntimeException("Export job failed: " + exportJobId, ex);
        }
    }

    private List<SubmissionEntity> loadSubmissions(Long taskId, ExportJobFilters filters) {
        LambdaQueryWrapper<SubmissionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionEntity::getTaskId, taskId);
        wrapper.eq(SubmissionEntity::getDeletedFlag, 0);
        if (!filters.statuses().isEmpty()) {
            wrapper.in(SubmissionEntity::getCurrentStatus, filters.statuses());
        } else if (!ExportJobFilters.SCOPE_ALL.equalsIgnoreCase(filters.exportScope())) {
            wrapper.eq(SubmissionEntity::getCurrentStatus, "APPROVED");
        }
        if (filters.labelerId() != null) {
            wrapper.eq(SubmissionEntity::getLabelerId, filters.labelerId());
        }
        wrapper.orderByAsc(SubmissionEntity::getId);
        return submissionMapper.selectList(wrapper);
    }

    private byte[] serialize(String format, Long taskId, List<SubmissionEntity> submissions, List<String> selectedFields)
            throws Exception {
        ExportFieldDisplaySupport.DisplayContext display =
                exportFieldDisplaySupport.buildContext(taskId, selectedFields);
        Map<Long, TaskItemEntity> items = ExportSubmissionRowBuilder.needsItemPayload(selectedFields)
                ? loadItems(submissions)
                : Map.of();
        Map<Long, ReviewRecordEntity> humanReviews = ExportSubmissionRowBuilder.needsReviewData(selectedFields)
                ? loadLatestHumanReviews(submissions)
                : Map.of();
        Map<Long, AiReviewRecordEntity> aiReviews = ExportSubmissionRowBuilder.needsReviewData(selectedFields)
                ? loadLatestAiReviews(submissions)
                : Map.of();

        List<Map<String, Object>> rows = submissions.stream()
                .map(submission -> ExportSubmissionRowBuilder.buildRow(
                        submission,
                        selectedFields,
                        items.get(submission.getItemId()),
                        humanReviews.get(submission.getId()),
                        aiReviews.get(submission.getId()),
                        objectMapper,
                        display))
                .toList();
        List<String> headers = ExportSubmissionRowBuilder.headersFor(selectedFields, display);

        return switch (format == null ? "" : format) {
            case "JSON" -> objectMapper.writeValueAsBytes(rows);
            case "JSONL" -> toJsonl(rows);
            case "EXCEL" -> toExcel(rows, headers);
            default -> toCsv(rows, headers);
        };
    }

    private Map<Long, TaskItemEntity> loadItems(List<SubmissionEntity> submissions) {
        List<Long> itemIds = submissions.stream()
                .map(SubmissionEntity::getItemId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (itemIds.isEmpty()) {
            return Map.of();
        }
        return taskItemMapper.selectBatchIds(itemIds).stream()
                .filter(item -> item.getDeletedFlag() == null || item.getDeletedFlag() == 0)
                .collect(Collectors.toMap(TaskItemEntity::getId, item -> item, (left, right) -> left));
    }

    private Map<Long, ReviewRecordEntity> loadLatestHumanReviews(List<SubmissionEntity> submissions) {
        List<Long> submissionIds = submissions.stream().map(SubmissionEntity::getId).toList();
        if (submissionIds.isEmpty()) {
            return Map.of();
        }
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(ReviewRecordEntity::getSubmissionId, submissionIds);
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0);
        wrapper.orderByDesc(ReviewRecordEntity::getDecidedAt);
        wrapper.orderByDesc(ReviewRecordEntity::getId);
        Map<Long, ReviewRecordEntity> latest = new HashMap<>();
        for (ReviewRecordEntity record : reviewRecordMapper.selectList(wrapper)) {
            latest.putIfAbsent(record.getSubmissionId(), record);
        }
        return latest;
    }

    private Map<Long, AiReviewRecordEntity> loadLatestAiReviews(List<SubmissionEntity> submissions) {
        List<Long> submissionIds = submissions.stream().map(SubmissionEntity::getId).toList();
        if (submissionIds.isEmpty()) {
            return Map.of();
        }
        LambdaQueryWrapper<AiReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(AiReviewRecordEntity::getSubmissionId, submissionIds);
        wrapper.eq(AiReviewRecordEntity::getDeletedFlag, 0);
        wrapper.orderByDesc(AiReviewRecordEntity::getFinishedAt);
        wrapper.orderByDesc(AiReviewRecordEntity::getId);
        Map<Long, AiReviewRecordEntity> latest = new HashMap<>();
        for (AiReviewRecordEntity record : aiReviewRecordMapper.selectList(wrapper)) {
            latest.putIfAbsent(record.getSubmissionId(), record);
        }
        return latest;
    }

    private byte[] toJsonl(List<Map<String, Object>> rows) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> row : rows) {
            sb.append(objectMapper.writeValueAsString(row)).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] toCsv(List<Map<String, Object>> rows, List<String> headers) throws Exception {
        StringBuilder sb = new StringBuilder();
        sb.append(String.join(",", headers)).append('\n');
        for (Map<String, Object> row : rows) {
            List<String> cells = new ArrayList<>(headers.size());
            for (String header : headers) {
                Object value = row.get(header);
                if (value != null && !(value instanceof String)) {
                    value = objectMapper.writeValueAsString(value);
                }
                cells.add(csvEscape(value == null ? "" : value.toString()));
            }
            sb.append(String.join(",", cells)).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String csvEscape(String value) {
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return '"' + value.replace("\"", "\"\"") + '"';
        }
        return value;
    }

    private byte[] toExcel(List<Map<String, Object>> rows, List<String> headers) throws Exception {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.xssf.usermodel.XSSFSheet sheet = workbook.createSheet("export");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                headerRow.createCell(i).setCellValue(headers.get(i));
            }
            for (int r = 0; r < rows.size(); r++) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(r + 1);
                Map<String, Object> data = rows.get(r);
                for (int c = 0; c < headers.size(); c++) {
                    Object value = data.get(headers.get(c));
                    if (value != null && !(value instanceof String)) {
                        value = objectMapper.writeValueAsString(value);
                    }
                    row.createCell(c).setCellValue(value == null ? "" : value.toString());
                }
            }
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private String sha256Hex(byte[] content) {
        return com.labelhub.core.util.DigestUtil.sha256Hex(content);
    }

    private String truncate(String msg) {
        if (msg == null) {
            return "unknown";
        }
        return msg.length() > 1000 ? msg.substring(0, 1000) : msg;
    }
}
