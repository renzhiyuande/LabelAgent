package com.labelhub.infra.async;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import java.net.InetAddress;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AsyncTaskWorker {
    private static final Logger log = LoggerFactory.getLogger(AsyncTaskWorker.class);

    private final AsyncTaskMapper asyncTaskMapper;
    private final AsyncTaskHandlerRegistry registry;
    private final String workerId;
    private final int batchSize;
    private final long claimTimeoutMs;

    public AsyncTaskWorker(
            AsyncTaskMapper asyncTaskMapper,
            AsyncTaskHandlerRegistry registry,
            @Value("${labelhub.async.batch-size:10}") int batchSize,
            @Value("${labelhub.async.claim-timeout-ms:120000}") long claimTimeoutMs) {
        this.asyncTaskMapper = asyncTaskMapper;
        this.registry = registry;
        this.batchSize = batchSize;
        this.claimTimeoutMs = claimTimeoutMs;
        this.workerId = resolveWorkerId();
    }

    @Scheduled(fixedDelayString = "${labelhub.async.poll-interval-ms:5000}")
    public void poll() {
        recoverZombieTasks();
        List<AsyncTaskEntity> candidates = fetchCandidates();
        for (AsyncTaskEntity candidate : candidates) {
            if (tryClaim(candidate)) {
                execute(candidate);
            }
        }
    }

    private List<AsyncTaskEntity> fetchCandidates() {
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.PENDING)
                .le(AsyncTaskEntity::getNextRunAt, Instant.now())
                .orderByAsc(AsyncTaskEntity::getPriority)
                .orderByAsc(AsyncTaskEntity::getId)
                .last("LIMIT " + batchSize);
        return asyncTaskMapper.selectList(wrapper);
    }

    private boolean tryClaim(AsyncTaskEntity task) {
        LambdaUpdateWrapper<AsyncTaskEntity> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(AsyncTaskEntity::getId, task.getId())
                .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.PENDING);
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setStatus(AsyncTaskStatus.RUNNING);
        update.setWorkerId(workerId);
        update.setLockedAt(Instant.now());
        update.setStartedAt(Instant.now());
        update.setUpdatedAt(Instant.now());
        return asyncTaskMapper.update(update, wrapper) == 1;
    }

    private void execute(AsyncTaskEntity task) {
        AsyncTaskEntity fresh = asyncTaskMapper.selectById(task.getId());
        if (fresh != null && AsyncTaskStatus.CANCELED.equals(fresh.getStatus())) {
            log.info("Async task {} was canceled, skipping", task.getId());
            return;
        }
        AsyncTaskHandler handler = registry.getHandler(task.getTaskType());
        if (handler == null) {
            log.error("No handler for async task type: {}", task.getTaskType());
            markDeadLetter(task, "NO_HANDLER", "No handler registered for type: " + task.getTaskType());
            return;
        }
        try {
            log.info(
                    "Async task executing taskId={} taskType={} bizType={} bizId={} bizKey={}",
                    task.getId(),
                    task.getTaskType(),
                    task.getBizType(),
                    task.getBizId(),
                    task.getBizKey());
            handler.handle(task);
            markSuccess(task);
        } catch (Exception ex) {
            log.warn(
                    "Async task failed taskId={} taskType={} bizKey={} error={}",
                    task.getId(),
                    task.getTaskType(),
                    task.getBizKey(),
                    ex.getMessage(),
                    ex);
            handleFailure(task, ex);
        }
    }

    private void markSuccess(AsyncTaskEntity task) {
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setId(task.getId());
        update.setStatus(AsyncTaskStatus.SUCCESS);
        update.setFinishedAt(Instant.now());
        update.setUpdatedAt(Instant.now());
        asyncTaskMapper.updateById(update);
        log.info(
                "Async task finished taskId={} taskType={} bizType={} bizId={} bizKey={} status=SUCCESS",
                task.getId(),
                task.getTaskType(),
                task.getBizType(),
                task.getBizId(),
                task.getBizKey());
    }

    private void handleFailure(AsyncTaskEntity task, Exception ex) {
        int retryCount = (task.getRetryCount() == null ? 0 : task.getRetryCount()) + 1;
        int maxRetry = task.getMaxRetryCount() == null ? 3 : task.getMaxRetryCount();
        if (retryCount >= maxRetry) {
            markDeadLetter(task, ex.getClass().getSimpleName(), truncate(ex.getMessage(), 500));
        } else {
            long delayMs = (long) Math.pow(2, retryCount) * 1000L;
            AsyncTaskEntity update = new AsyncTaskEntity();
            update.setId(task.getId());
            update.setStatus(AsyncTaskStatus.PENDING);
            update.setRetryCount(retryCount);
            update.setNextRunAt(Instant.now().plusMillis(delayMs));
            update.setWorkerId(null);
            update.setLockedAt(null);
            update.setLastErrorCode(ex.getClass().getSimpleName());
            update.setLastErrorMessage(truncate(ex.getMessage(), 500));
            update.setUpdatedAt(Instant.now());
            asyncTaskMapper.updateById(update);
        }
    }

    private void markDeadLetter(AsyncTaskEntity task, String errorCode, String errorMessage) {
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setId(task.getId());
        update.setStatus(AsyncTaskStatus.DEAD_LETTER);
        update.setDeadLetteredAt(Instant.now());
        update.setLastErrorCode(errorCode);
        update.setLastErrorMessage(truncate(errorMessage, 500));
        update.setUpdatedAt(Instant.now());
        asyncTaskMapper.updateById(update);
    }

    private void recoverZombieTasks() {
        Instant threshold = Instant.now().minusMillis(claimTimeoutMs);
        LambdaUpdateWrapper<AsyncTaskEntity> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.RUNNING)
                .lt(AsyncTaskEntity::getLockedAt, threshold);
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setStatus(AsyncTaskStatus.PENDING);
        update.setWorkerId(null);
        update.setLockedAt(null);
        update.setUpdatedAt(Instant.now());
        int recovered = asyncTaskMapper.update(update, wrapper);
        if (recovered > 0) {
            log.info("Recovered {} zombie async tasks", recovered);
        }
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }

    private static String resolveWorkerId() {
        try {
            return InetAddress.getLocalHost().getHostName() + ":" + ProcessHandle.current().pid();
        } catch (Exception ex) {
            return "worker-" + ProcessHandle.current().pid();
        }
    }
}
