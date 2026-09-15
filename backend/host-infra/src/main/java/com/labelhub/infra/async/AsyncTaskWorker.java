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
    private final long retryBaseDelayMs;
    private final long retryMaxDelayMs;

    public AsyncTaskWorker(
            AsyncTaskMapper asyncTaskMapper,
            AsyncTaskHandlerRegistry registry,
            @Value("${labelhub.async.batch-size:10}") int batchSize,
            @Value("${labelhub.async.claim-timeout-ms:120000}") long claimTimeoutMs,
            @Value("${labelhub.async.retry-base-delay-ms:1000}") long retryBaseDelayMs,
            @Value("${labelhub.async.retry-max-delay-ms:60000}") long retryMaxDelayMs) {
        this.asyncTaskMapper = asyncTaskMapper;
        this.registry = registry;
        this.batchSize = batchSize;
        this.claimTimeoutMs = claimTimeoutMs;
        this.retryBaseDelayMs = Math.max(100, retryBaseDelayMs);
        this.retryMaxDelayMs = Math.max(this.retryBaseDelayMs, retryMaxDelayMs);
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
            markDeadLetter(task, "NO_HANDLER", "No handler registered for type: " + task.getTaskType(),
                    currentRetryCount(task), null);
            return;
        }
        try {
            log.info(
                    "Async task executing taskId={} taskType={} bizType={} bizId={} bizKey={} retry={}",
                    task.getId(),
                    task.getTaskType(),
                    task.getBizType(),
                    task.getBizId(),
                    task.getBizKey(),
                    currentRetryCount(task));
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
            handleFailure(task, handler, ex);
        }
    }

    private void markSuccess(AsyncTaskEntity task) {
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setId(task.getId());
        update.setStatus(AsyncTaskStatus.SUCCESS);
        update.setFinishedAt(Instant.now());
        update.setWorkerId(null);
        update.setLockedAt(null);
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

    private void handleFailure(AsyncTaskEntity task, AsyncTaskHandler handler, Exception ex) {
        int retryCount = currentRetryCount(task) + 1;
        int maxRetry = maxRetryCount(task);
        String errorCode = ex.getClass().getSimpleName();
        String errorMessage = truncate(ex.getMessage(), 500);
        if (retryCount >= maxRetry) {
            markDeadLetter(task, errorCode, errorMessage, retryCount, handler);
            return;
        }

        long delayMs = backoffDelayMs(retryCount);
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setId(task.getId());
        update.setStatus(AsyncTaskStatus.PENDING);
        update.setRetryCount(retryCount);
        update.setNextRunAt(Instant.now().plusMillis(delayMs));
        update.setWorkerId(null);
        update.setLockedAt(null);
        update.setLastErrorCode(errorCode);
        update.setLastErrorMessage(errorMessage);
        update.setUpdatedAt(Instant.now());
        asyncTaskMapper.updateById(update);
        log.info(
                "Async task scheduled for retry taskId={} retry={}/{} delayMs={}",
                task.getId(), retryCount, maxRetry, delayMs);
    }

    private void markDeadLetter(
            AsyncTaskEntity task,
            String errorCode,
            String errorMessage,
            int retryCount,
            AsyncTaskHandler handler) {
        Instant now = Instant.now();
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setId(task.getId());
        update.setStatus(AsyncTaskStatus.DEAD_LETTER);
        update.setRetryCount(retryCount);
        update.setDeadLetteredAt(now);
        update.setFinishedAt(now);
        update.setWorkerId(null);
        update.setLockedAt(null);
        update.setLastErrorCode(errorCode);
        update.setLastErrorMessage(truncate(errorMessage, 500));
        update.setUpdatedAt(now);
        asyncTaskMapper.updateById(update);
        log.error(
                "Async task dead-lettered taskId={} taskType={} retry={} errorCode={}",
                task.getId(), task.getTaskType(), retryCount, errorCode);
        notifyDeadLetter(task, handler, errorCode, errorMessage);
    }

    private void notifyDeadLetter(
            AsyncTaskEntity task,
            AsyncTaskHandler handler,
            String errorCode,
            String errorMessage) {
        if (handler == null) {
            return;
        }
        AsyncTaskEntity persisted = asyncTaskMapper.selectById(task.getId());
        try {
            handler.onDeadLetter(persisted != null ? persisted : task, errorCode, truncate(errorMessage, 500));
        } catch (Exception callbackError) {
            // Dead-letter is already durable. Business compensation failure is observable but must not resurrect the task.
            log.error(
                    "Async task dead-letter callback failed taskId={} taskType={} error={}",
                    task.getId(), task.getTaskType(), callbackError.getMessage(), callbackError);
        }
    }

    /**
     * RUNNING 任务超过 claim timeout 后按一次失败处理，而不是无限重置为 PENDING。
     * 这样进程持续崩溃的任务最终也会进入 DEAD_LETTER，避免永久毒任务。
     */
    private void recoverZombieTasks() {
        Instant threshold = Instant.now().minusMillis(claimTimeoutMs);
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.RUNNING)
                .lt(AsyncTaskEntity::getLockedAt, threshold)
                .orderByAsc(AsyncTaskEntity::getId)
                .last("LIMIT " + batchSize);
        List<AsyncTaskEntity> staleTasks = asyncTaskMapper.selectList(wrapper);
        for (AsyncTaskEntity task : staleTasks) {
            int retryCount = currentRetryCount(task) + 1;
            int maxRetry = maxRetryCount(task);
            AsyncTaskHandler handler = registry.getHandler(task.getTaskType());
            if (retryCount >= maxRetry) {
                markDeadLetter(task, "CLAIM_TIMEOUT",
                        "Worker lease expired before task completion", retryCount, handler);
                continue;
            }

            long delayMs = backoffDelayMs(retryCount);
            LambdaUpdateWrapper<AsyncTaskEntity> claimWrapper = new LambdaUpdateWrapper<>();
            claimWrapper.eq(AsyncTaskEntity::getId, task.getId())
                    .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.RUNNING)
                    .eq(AsyncTaskEntity::getWorkerId, task.getWorkerId());
            AsyncTaskEntity update = new AsyncTaskEntity();
            update.setStatus(AsyncTaskStatus.PENDING);
            update.setRetryCount(retryCount);
            update.setNextRunAt(Instant.now().plusMillis(delayMs));
            update.setWorkerId(null);
            update.setLockedAt(null);
            update.setLastErrorCode("CLAIM_TIMEOUT");
            update.setLastErrorMessage("Worker lease expired before task completion");
            update.setUpdatedAt(Instant.now());
            int recovered = asyncTaskMapper.update(update, claimWrapper);
            if (recovered == 1) {
                log.warn(
                        "Recovered zombie async task taskId={} retry={}/{} delayMs={}",
                        task.getId(), retryCount, maxRetry, delayMs);
            }
        }
    }

    private long backoffDelayMs(int retryCount) {
        int exponent = Math.max(0, Math.min(retryCount - 1, 20));
        long multiplier = 1L << exponent;
        long candidate;
        try {
            candidate = Math.multiplyExact(retryBaseDelayMs, multiplier);
        } catch (ArithmeticException ignored) {
            candidate = retryMaxDelayMs;
        }
        return Math.min(candidate, retryMaxDelayMs);
    }

    private static int currentRetryCount(AsyncTaskEntity task) {
        return task.getRetryCount() == null ? 0 : task.getRetryCount();
    }

    private static int maxRetryCount(AsyncTaskEntity task) {
        return task.getMaxRetryCount() == null || task.getMaxRetryCount() < 1 ? 3 : task.getMaxRetryCount();
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
