package com.labelhub.infra.business.stats.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.DailyStatsBackfillResult;
import com.labelhub.core.business.BusinessDtos.PlatformStatsOverview;
import com.labelhub.core.business.BusinessDtos.TaskStatsOverview;
import com.labelhub.core.business.StatsService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.SubmissionStatusHistoryEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.entity.TaskStatsDailyEntity;
import com.labelhub.infra.persistence.entity.TaskStatsSnapshotEntity;
import com.labelhub.infra.persistence.entity.UserStatsDailyEntity;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.SubmissionStatusHistoryMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TaskStatsDailyMapper;
import com.labelhub.infra.persistence.mapper.TaskStatsSnapshotMapper;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.persistence.mapper.UserStatsDailyMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbStatsService implements StatsService {
    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;
    private final AssignmentMapper assignmentMapper;
    private final SubmissionMapper submissionMapper;
    private final UserMapper userMapper;
    private final TaskStatsSnapshotMapper snapshotMapper;
    private final SubmissionStatusHistoryMapper historyMapper;
    private final TaskStatsDailyMapper taskStatsDailyMapper;
    private final UserStatsDailyMapper userStatsDailyMapper;

    public DbStatsService(TaskMapper taskMapper, TaskItemMapper taskItemMapper, AssignmentMapper assignmentMapper,
            SubmissionMapper submissionMapper, UserMapper userMapper, TaskStatsSnapshotMapper snapshotMapper,
            SubmissionStatusHistoryMapper historyMapper, TaskStatsDailyMapper taskStatsDailyMapper,
            UserStatsDailyMapper userStatsDailyMapper) {
        this.taskMapper = taskMapper;
        this.taskItemMapper = taskItemMapper;
        this.assignmentMapper = assignmentMapper;
        this.submissionMapper = submissionMapper;
        this.userMapper = userMapper;
        this.snapshotMapper = snapshotMapper;
        this.historyMapper = historyMapper;
        this.taskStatsDailyMapper = taskStatsDailyMapper;
        this.userStatsDailyMapper = userStatsDailyMapper;
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public TaskStatsOverview taskOverview(Long taskId) {
        return computeTaskOverview(taskId);
    }

    /** 后台异步刷新任务统计快照，不经过权限校验。 */
    @Transactional
    public void refreshTaskStatsSnapshot(Long taskId) {
        computeTaskOverview(taskId);
    }

    private TaskStatsOverview computeTaskOverview(Long taskId) {
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }

        Map<String, Long> subCounts = submissionStatusCounts(taskId);
        Map<String, Long> asgCounts = assignmentStatusCounts(taskId);

        long itemTotal = taskItemMapper.selectCount(new LambdaQueryWrapper<TaskItemEntity>()
                .eq(TaskItemEntity::getTaskId, taskId).eq(TaskItemEntity::getDeletedFlag, 0));
        long approved = subCounts.getOrDefault("APPROVED", 0L);
        long totalSubmissions = subCounts.values().stream().mapToLong(Long::longValue).sum();
        long activeLabelers = countDistinctLabelers(taskId);
        double approvalRate = totalSubmissions == 0 ? 0.0
                : Math.round((double) approved / totalSubmissions * 10000) / 10000.0;

        upsertSnapshot(taskId, itemTotal, asgCounts, subCounts, approved, activeLabelers);

        return new TaskStatsOverview(
                taskId,
                itemTotal,
                asgCounts.getOrDefault("UNCLAIMED", 0L),
                asgCounts.getOrDefault("CLAIMED", 0L),
                subCounts.getOrDefault("DRAFT", 0L),
                subCounts.getOrDefault("SUBMITTED", 0L),
                subCounts.getOrDefault("AI_REVIEWING", 0L),
                subCounts.getOrDefault("AI_REJECTED", 0L),
                subCounts.getOrDefault("HUMAN_REVIEWING", 0L),
                subCounts.getOrDefault("NEEDS_REVISION", 0L),
                approved,
                subCounts.getOrDefault("REJECTED", 0L),
                approved,
                activeLabelers,
                approvalRate,
                Instant.now());
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public PlatformStatsOverview platformOverview() {
        long totalTasks = taskMapper.selectCount(new LambdaQueryWrapper<TaskEntity>()
                .eq(TaskEntity::getDeletedFlag, 0));
        Map<String, Long> taskStatus = taskStatusCounts();
        Map<String, Long> subCounts = submissionStatusCounts(null);
        long totalSubmissions = subCounts.values().stream().mapToLong(Long::longValue).sum();
        long pendingReview = subCounts.getOrDefault("SUBMITTED", 0L)
                + subCounts.getOrDefault("AI_REVIEWING", 0L)
                + subCounts.getOrDefault("HUMAN_REVIEWING", 0L);
        long totalUsers = userMapper.selectCount(new LambdaQueryWrapper<com.labelhub.infra.persistence.entity.UserEntity>()
                .eq(com.labelhub.infra.persistence.entity.UserEntity::getDeletedFlag, 0));

        return new PlatformStatsOverview(
                totalTasks,
                taskStatus.getOrDefault("PUBLISHED", 0L),
                taskStatus.getOrDefault("DRAFT", 0L),
                taskStatus.getOrDefault("ARCHIVED", 0L),
                totalSubmissions,
                subCounts.getOrDefault("APPROVED", 0L),
                pendingReview,
                totalUsers);
    }

    private void upsertSnapshot(Long taskId, long itemTotal, Map<String, Long> asgCounts,
            Map<String, Long> subCounts, long approved, long activeLabelers) {
        TaskStatsSnapshotEntity existing = snapshotMapper.selectOne(new LambdaQueryWrapper<TaskStatsSnapshotEntity>()
                .eq(TaskStatsSnapshotEntity::getTaskId, taskId)
                .eq(TaskStatsSnapshotEntity::getDeletedFlag, 0)
                .last("LIMIT 1"));
        TaskStatsSnapshotEntity e = existing != null ? existing : new TaskStatsSnapshotEntity();
        e.setTaskId(taskId);
        e.setItemTotalCount((int) itemTotal);
        e.setAvailableCount(asgCounts.getOrDefault("UNCLAIMED", 0L).intValue());
        e.setClaimedCount(asgCounts.getOrDefault("CLAIMED", 0L).intValue());
        e.setInProgressCount(subCounts.getOrDefault("DRAFT", 0L).intValue());
        e.setSubmittedCount(subCounts.getOrDefault("SUBMITTED", 0L).intValue());
        e.setAiReviewingCount(subCounts.getOrDefault("AI_REVIEWING", 0L).intValue());
        e.setAiRejectedCount(subCounts.getOrDefault("AI_REJECTED", 0L).intValue());
        e.setHumanReviewingCount(subCounts.getOrDefault("HUMAN_REVIEWING", 0L).intValue());
        e.setNeedsRevisionCount(subCounts.getOrDefault("NEEDS_REVISION", 0L).intValue());
        e.setApprovedCount((int) approved);
        e.setRejectedCount(subCounts.getOrDefault("REJECTED", 0L).intValue());
        e.setExportableCount((int) approved);
        e.setActiveLabelerCount((int) activeLabelers);
        e.setRefreshedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        if (existing != null) {
            snapshotMapper.updateById(e);
        } else {
            e.setCreatedAt(Instant.now());
            snapshotMapper.insert(e);
        }
    }

    private Map<String, Long> submissionStatusCounts(Long taskId) {
        QueryWrapper<SubmissionEntity> qw = new QueryWrapper<>();
        qw.select("current_status AS status", "COUNT(*) AS cnt");
        qw.eq("deleted_flag", 0);
        if (taskId != null) {
            qw.eq("task_id", taskId);
        }
        qw.groupBy("current_status");
        return toCountMap(submissionMapper.selectMaps(qw));
    }

    private Map<String, Long> assignmentStatusCounts(Long taskId) {
        QueryWrapper<AssignmentEntity> qw = new QueryWrapper<>();
        qw.select("status AS status", "COUNT(*) AS cnt");
        qw.eq("deleted_flag", 0);
        qw.eq("task_id", taskId);
        qw.groupBy("status");
        return toCountMap(assignmentMapper.selectMaps(qw));
    }

    private Map<String, Long> taskStatusCounts() {
        QueryWrapper<TaskEntity> qw = new QueryWrapper<>();
        qw.select("status AS status", "COUNT(*) AS cnt");
        qw.eq("deleted_flag", 0);
        qw.groupBy("status");
        return toCountMap(taskMapper.selectMaps(qw));
    }

    private long countDistinctLabelers(Long taskId) {
        QueryWrapper<SubmissionEntity> qw = new QueryWrapper<>();
        qw.select("COUNT(DISTINCT labeler_id) AS cnt");
        qw.eq("deleted_flag", 0);
        qw.eq("task_id", taskId);
        List<Map<String, Object>> rows = submissionMapper.selectMaps(qw);
        if (rows.isEmpty() || rows.get(0).get("cnt") == null) {
            return 0L;
        }
        return ((Number) rows.get(0).get("cnt")).longValue();
    }

    private Map<String, Long> toCountMap(List<Map<String, Object>> rows) {
        Map<String, Long> result = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Object status = row.get("status");
            Object cnt = row.get("cnt");
            if (status == null || cnt == null) {
                continue;
            }
            result.put(status.toString(), ((Number) cnt).longValue());
        }
        return result;
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    public DailyStatsBackfillResult backfillDailyStats(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "无效的统计日期区间");
        }
        ZoneId zone = ZoneId.systemDefault();
        Instant fromInstant = from.atStartOfDay(zone).toInstant();
        Instant toExclusive = to.plusDays(1).atStartOfDay(zone).toInstant();

        int taskRows = backfillTaskDaily(fromInstant, toExclusive);
        int userRows = backfillUserDaily(fromInstant, toExclusive);
        return new DailyStatsBackfillResult(from.toString(), to.toString(), taskRows, userRows);
    }

    private int backfillTaskDaily(Instant fromInstant, Instant toExclusive) {
        QueryWrapper<SubmissionStatusHistoryEntity> qw = new QueryWrapper<>();
        qw.select("task_id AS taskId", "DATE(occurred_at) AS statDate", "to_status AS toStatus", "COUNT(*) AS cnt");
        qw.eq("deleted_flag", 0).ge("occurred_at", fromInstant).lt("occurred_at", toExclusive);
        qw.groupBy("task_id", "DATE(occurred_at)", "to_status");
        List<Map<String, Object>> rows = historyMapper.selectMaps(qw);

        Map<String, TaskStatsDailyEntity> agg = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Long taskId = ((Number) row.get("taskId")).longValue();
            LocalDate statDate = toLocalDate(row.get("statDate"));
            if (taskId == null || statDate == null) {
                continue;
            }
            String key = taskId + "|" + statDate;
            TaskStatsDailyEntity e = agg.computeIfAbsent(key, k -> {
                TaskStatsDailyEntity n = new TaskStatsDailyEntity();
                n.setTaskId(taskId);
                n.setStatDate(statDate);
                return n;
            });
            long cnt = ((Number) row.get("cnt")).longValue();
            switch (str(row.get("toStatus"))) {
                case "SUBMITTED" -> e.setSubmitCount(intVal(e.getSubmitCount()) + (int) cnt);
                case "NEEDS_REVISION" -> e.setRevisionCount(intVal(e.getRevisionCount()) + (int) cnt);
                case "AI_REJECTED" -> e.setAiRejectCount(intVal(e.getAiRejectCount()) + (int) cnt);
                case "APPROVED" -> e.setApproveCount(intVal(e.getApproveCount()) + (int) cnt);
                case "REJECTED" -> e.setRejectCount(intVal(e.getRejectCount()) + (int) cnt);
                default -> {
                }
            }
        }

        for (TaskStatsDailyEntity e : agg.values()) {
            TaskStatsDailyEntity existing = taskStatsDailyMapper.selectOne(new LambdaQueryWrapper<TaskStatsDailyEntity>()
                    .eq(TaskStatsDailyEntity::getTaskId, e.getTaskId())
                    .eq(TaskStatsDailyEntity::getStatDate, e.getStatDate())
                    .eq(TaskStatsDailyEntity::getDeletedFlag, 0)
                    .last("LIMIT 1"));
            e.setUpdatedAt(Instant.now());
            if (existing != null) {
                e.setId(existing.getId());
                taskStatsDailyMapper.updateById(e);
            } else {
                e.setCreatedAt(Instant.now());
                taskStatsDailyMapper.insert(e);
            }
        }
        return agg.size();
    }

    private int backfillUserDaily(Instant fromInstant, Instant toExclusive) {
        QueryWrapper<SubmissionStatusHistoryEntity> qw = new QueryWrapper<>();
        qw.select("operator_id AS userId", "operator_type AS operatorType", "task_id AS taskId",
                "DATE(occurred_at) AS statDate", "to_status AS toStatus", "COUNT(*) AS cnt");
        qw.eq("deleted_flag", 0).gt("operator_id", 0).ge("occurred_at", fromInstant).lt("occurred_at", toExclusive);
        qw.groupBy("operator_id", "operator_type", "task_id", "DATE(occurred_at)", "to_status");
        List<Map<String, Object>> rows = historyMapper.selectMaps(qw);

        Map<String, UserStatsDailyEntity> agg = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Long userId = ((Number) row.get("userId")).longValue();
            Long taskId = row.get("taskId") == null ? 0L : ((Number) row.get("taskId")).longValue();
            LocalDate statDate = toLocalDate(row.get("statDate"));
            String roleCode = roleCodeOf(str(row.get("operatorType")));
            if (userId == null || statDate == null) {
                continue;
            }
            String key = userId + "|" + roleCode + "|" + taskId + "|" + statDate;
            UserStatsDailyEntity e = agg.computeIfAbsent(key, k -> {
                UserStatsDailyEntity n = new UserStatsDailyEntity();
                n.setUserId(userId);
                n.setRoleCode(roleCode);
                n.setTaskId(taskId);
                n.setStatDate(statDate);
                return n;
            });
            long cnt = ((Number) row.get("cnt")).longValue();
            switch (str(row.get("toStatus"))) {
                case "SUBMITTED" -> e.setSubmitCount(intVal(e.getSubmitCount()) + (int) cnt);
                case "APPROVED" -> e.setApproveCount(intVal(e.getApproveCount()) + (int) cnt);
                case "REJECTED" -> e.setRejectCount(intVal(e.getRejectCount()) + (int) cnt);
                case "NEEDS_REVISION" -> e.setReturnCount(intVal(e.getReturnCount()) + (int) cnt);
                default -> {
                }
            }
        }

        for (UserStatsDailyEntity e : agg.values()) {
            UserStatsDailyEntity existing = userStatsDailyMapper.selectOne(new LambdaQueryWrapper<UserStatsDailyEntity>()
                    .eq(UserStatsDailyEntity::getUserId, e.getUserId())
                    .eq(UserStatsDailyEntity::getRoleCode, e.getRoleCode())
                    .eq(UserStatsDailyEntity::getTaskId, e.getTaskId())
                    .eq(UserStatsDailyEntity::getStatDate, e.getStatDate())
                    .eq(UserStatsDailyEntity::getDeletedFlag, 0)
                    .last("LIMIT 1"));
            e.setUpdatedAt(Instant.now());
            if (existing != null) {
                e.setId(existing.getId());
                userStatsDailyMapper.updateById(e);
            } else {
                e.setCreatedAt(Instant.now());
                userStatsDailyMapper.insert(e);
            }
        }
        return agg.size();
    }

    private String roleCodeOf(String operatorType) {
        if (operatorType == null) {
            return "unknown";
        }
        return switch (operatorType.toUpperCase()) {
            case "LABELER" -> "labeler";
            case "REVIEWER" -> "reviewer";
            case "AI" -> "ai";
            default -> operatorType.toLowerCase();
        };
    }

    private LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate d) {
            return d;
        }
        if (value instanceof java.sql.Date d) {
            return d.toLocalDate();
        }
        if (value instanceof java.util.Date d) {
            return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        return LocalDate.parse(value.toString().substring(0, 10));
    }

    private int intVal(Integer v) {
        return v == null ? 0 : v;
    }

    private String str(Object v) {
        return v == null ? "" : v.toString();
    }
}
