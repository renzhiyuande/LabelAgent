package com.labelhub.infra.async;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AsyncTaskService {
    private static final Logger log = LoggerFactory.getLogger(AsyncTaskService.class);
    private final AsyncTaskMapper asyncTaskMapper;
    private final ObjectMapper objectMapper;

    public AsyncTaskService(AsyncTaskMapper asyncTaskMapper, ObjectMapper objectMapper) {
        this.asyncTaskMapper = asyncTaskMapper;
        this.objectMapper = objectMapper;
    }

    public boolean enqueue(String taskType, String bizType, Long bizId, String bizKey,
            int priority, Map<String, Object> payload) {
        return enqueue(taskType, bizType, bizId, bizKey, priority, payload, Instant.now());
    }

    public boolean enqueue(String taskType, String bizType, Long bizId, String bizKey,
            int priority, Map<String, Object> payload, Instant runAt) {
        AsyncTaskEntity entity = new AsyncTaskEntity();
        entity.setTaskType(taskType);
        entity.setBizType(bizType);
        entity.setBizId(bizId);
        entity.setBizKey(bizKey);
        entity.setPriority(priority);
        entity.setStatus(AsyncTaskStatus.PENDING);
        entity.setNextRunAt(runAt != null ? runAt : Instant.now());
        entity.setRetryCount(0);
        entity.setMaxRetryCount(3);
        entity.setManualRetryCount(0);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        try {
            entity.setPayloadJson(objectMapper.writeValueAsString(payload == null ? Map.of() : payload));
        } catch (Exception ex) {
            entity.setPayloadJson("{}");
        }
        try {
            asyncTaskMapper.insert(entity);
            return true;
        } catch (DuplicateKeyException ignored) {
            log.info(
                    "Async task enqueue skipped duplicate taskType={} bizType={} bizId={} bizKey={} (unique biz_key already exists, likely prior SUCCESS/PENDING record)",
                    taskType,
                    bizType,
                    bizId,
                    bizKey);
            return false;
        }
    }

    public int cancelOpenTasks(String taskType, String bizType, Long bizId) {
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncTaskEntity::getTaskType, taskType)
                .eq(AsyncTaskEntity::getBizType, bizType)
                .eq(AsyncTaskEntity::getBizId, bizId)
                .in(AsyncTaskEntity::getStatus, AsyncTaskStatus.PENDING, AsyncTaskStatus.RUNNING);
        java.util.List<AsyncTaskEntity> tasks = asyncTaskMapper.selectList(wrapper);
        int updated = 0;
        for (AsyncTaskEntity entity : tasks) {
            entity.setStatus(AsyncTaskStatus.CANCELED);
            entity.setCanceledAt(Instant.now());
            entity.setUpdatedAt(Instant.now());
            updated += asyncTaskMapper.updateById(entity);
        }
        return updated;
    }

    public void mergePayload(Long taskId, Map<String, Object> fields) {
        if (taskId == null || fields == null || fields.isEmpty()) {
            return;
        }
        AsyncTaskEntity existing = asyncTaskMapper.selectById(taskId);
        if (existing == null) {
            return;
        }
        Map<String, Object> payload = readPayload(existing.getPayloadJson());
        payload.putAll(fields);
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setId(taskId);
        try {
            update.setPayloadJson(objectMapper.writeValueAsString(payload));
        } catch (Exception ex) {
            log.warn("Failed to merge async task payload taskId={}: {}", taskId, ex.getMessage());
            return;
        }
        update.setUpdatedAt(Instant.now());
        asyncTaskMapper.updateById(update);
    }

    private Map<String, Object> readPayload(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return new LinkedHashMap<>(objectMapper.readValue(payloadJson, new TypeReference<Map<String, Object>>() {}));
        } catch (Exception ex) {
            log.warn("Failed to parse async task payload: {}", ex.getMessage());
            return new LinkedHashMap<>();
        }
    }

    /** 长耗时任务执行期间刷新 locked_at，避免 claim 超时后被误判为僵尸任务。 */
    public void touchLock(Long taskId) {
        if (taskId == null) {
            return;
        }
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setId(taskId);
        update.setLockedAt(Instant.now());
        update.setUpdatedAt(Instant.now());
        asyncTaskMapper.updateById(update);
    }
}
