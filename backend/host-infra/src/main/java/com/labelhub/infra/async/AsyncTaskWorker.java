package com.labelhub.infra.async;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import jakarta.annotation.PreDestroy;
import java.net.InetAddress;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final long heartbeatIntervalMs;
    private final ScheduledExecutorService heartbeatExecutor;

    @Autowired
    public AsyncTaskWorker(
            AsyncTaskMapper asyncTaskMapper,
            AsyncTaskHandlerRegistry registry,
            @Value("${labelhub.async.batch-size:10}") int batchSize,
            @Value("${labelhub.async.claim-timeout-ms:120000}") long claimTimeoutMs,
            @Value("${labelhub.async.retry-base-delay-ms:1000}") long retryBaseDelayMs,
            @Value("${labelhub.async.retry-max-delay-ms:60000}") long retryMaxDelayMs,
            @Value("${labelhub.async.heartbeat-interval-ms:30000}") long heartbeatIntervalMs) {
        this.asyncTaskMapper = asyncTaskMapper;
        this.registry = registry;
        this.batchSize = batchSize;
        this.claimTimeoutMs = claimTimeoutMs;
        this.retryBaseDelayMs = Math.max(100, retryBaseDelayMs);
        this.retryMaxDelayMs = Math.max(this.retryBaseDelayMs, retryMaxDelayMs);
        long safeHeartbeatUpperBound = Math.max(1000, claimTimeoutMs / 3);
        this.heartbeatIntervalMs = Math.max(500, Math.min(heartbeatIntervalMs, safeHeartbeatUpperBound));
        this.workerId = resolveWorkerId();
        this.heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "async-task-heartbeat-" + workerId);
            thread.setDaemon(true);
            return thread;
        });
    }

    /** Package-private compatibility constructor retained for existing white-box tests. */
    AsyncTaskWorker(
            AsyncTaskMapper asyncTaskMapper,
            AsyncTaskHandlerRegistry registry,
            int batchSize,
            long claimTimeoutMs) {
        this(asyncTaskMapper, registry, batchSize, claimTimeoutMs, 1000, 60000, 30000);
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
        Instant now = Instant.now();
        LambdaUpdateWrapper<AsyncTaskEntity> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(AsyncTaskEntity::getId, task.getId())
                .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.PENDING);
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setStatus(AsyncTaskStatus.RUNNING);
        update.setWorkerId(workerId);
        update.setLockedAt(now);
        update.setStartedAt(now);
        update.setUpdatedAt(now);
        boolean claimed = asyncTaskMapper.update(update, wrapper) == 1;
        if (claimed) {
            // Keep the in-memory lease token aligned with the durable row so every terminal
            // transition can prove this worker still owns the task.
            task.setStatus(AsyncTaskStatus.RUNNING);
            task.setWorkerId(workerId);
            task.setLockedAt(now);
            task.setStartedAt(now);
        }
        return claimed;
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

        ScheduledFuture<?> heartbeat = startHeartbeat(task.getId());
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
        } finally {
            heartbeat.cancel(false);
        }
    }

    private ScheduledFuture<?> startHeartbeat(Long taskId) {
        return heartbeatExecutor.scheduleAtFixedRate(
                () -> heartbeat(taskId),
                heartbeatIntervalMs,
                heartbeatIntervalMs,
                TimeUnit.MILLISECONDS);
    }

    private void heartbeat(Long taskId) {
        try {
            LambdaUpdateWrapper<AsyncTaskEntity> wrapper = ownedRunningTask(taskId);
            AsyncTaskEntity update = new AsyncTaskEntity();
            update.setLockedAt(Instant.now());
            update.setUpdatedAt(Instant.now());
            int touched = asyncTaskMapper.update(update, wrapper);
            if (touched == 0) {
                log.debug("Async task heartbeat skipped taskId={} workerId={} (lease no longer owned)", taskId, workerId);
            }
        } catch (Exception ex) {
            // A heartbeat failure should be observable, but the business handler keeps running.
            // If the process/DB stays unhealthy long enough, normal lease recovery will take over.
            log.warn("Async task heartbeat failed taskId={} workerId={} error={}", taskId, workerId, ex.getMessage());
        }
    }

    private void markSuccess(AsyncTaskEntity task) {
        AsyncTaskEntity update = new AsyncTaskEntity();
        update.setStatus(AsyncTaskStatus.SUCCESS);
        update.setFinishedAt(Instant.now());
        update.setWorkerId(null);
        update.setLockedAt(null);
        update.setUpdatedAt(Instant.now());
        int changed = asyncTaskMapper.update(update, ownedRunningTask(task));
        if (changed != 1) {
            log.warn(
                    "Async task stale success ignored taskId={} taskType={} workerId={}",
                    task.getId(), task.getTaskType(), task.getWorkerId());
            return;
        }
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
        update.setStatus(AsyncTaskStatus.PENDING);
        update.setRetryCount(retryCount);
        update.setNextRunAt(Instant.now().plusMillis(delayMs));
        update.setWorkerId(null);
        update.setLockedAt(null);
        update.setLastErrorCode(errorCode);
        update.setLastErrorMessage(errorMessage);
        update.setUpdatedAt(Instant.now());
        int changed = asyncTaskMapper.update(update, ownedRunningTask(task));
        if (changed != 1) {
            log.warn(
                    "Async task stale failure ignored taskId={} taskType={} workerId={}",
                    task.getId(), task.getTaskType(), task.getWorkerId());
            return;
        }
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
        update.setStatus(AsyncTaskStatus.DEAD_LETTER);
        update.setRetryCount(retryCount);
        update.setDeadLetteredAt(now);
        update.setFinishedAt(now);
        update.setWorkerId(null);
        update.setLockedAt(null);
        update.setLastErrorCode(errorCode);
        update.setLastErrorMessage(truncate(errorMessage, 500));
        update.setUpdatedAt(now);
        int changed = asyncTaskMapper.update(update, ownedRunningTask(task));
        if (changed != 1) {
            log.info(
                    "Async task dead-letter skipped taskId={} because lease/status changed workerId={}",
                    task.getId(), task.getWorkerId());
            return;
        }
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
     * RUNNING tasks beyond the lease timeout consume retry budget instead of being
     * reset to PENDING forever. A crashed poison task therefore eventually reaches DLQ.
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
            LambdaUpdateWrapper<AsyncTaskEntity> claimWrapper = ownedRunningTask(task);
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

    private LambdaUpdateWrapper<AsyncTaskEntity> ownedRunningTask(Long taskId) {
        LambdaUpdateWrapper<AsyncTaskEntity> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(AsyncTaskEntity::getId, taskId)
                .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.RUNNING)
                .eq(AsyncTaskEntity::getWorkerId, workerId);
        return wrapper;
    }

    private static LambdaUpdateWrapper<AsyncTaskEntity> ownedRunningTask(AsyncTaskEntity task) {
        LambdaUpdateWrapper<AsyncTaskEntity> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(AsyncTaskEntity::getId, task.getId())
                .eq(AsyncTaskEntity::getStatus, AsyncTaskStatus.RUNNING);
        if (task.getWorkerId() == null) {
            wrapper.isNull(AsyncTaskEntity::getWorkerId);
        } else {
            wrapper.eq(AsyncTaskEntity::getWorkerId, task.getWorkerId());
        }
        return wrapper;
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

    @PreDestroy
    public void shutdown() {
        heartbeatExecutor.shutdownNow();
    }

    private static String resolveWorkerId() {
        try {
            return InetAddress.getLocalHost().getHostName() + ":" + ProcessHandle.current().pid();
        } catch (Exception ex) {
            return "worker-" + ProcessHandle.current().pid();
        }
    }
}
