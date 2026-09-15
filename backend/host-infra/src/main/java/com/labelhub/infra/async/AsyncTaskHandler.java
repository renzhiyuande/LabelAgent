package com.labelhub.infra.async;

import com.labelhub.infra.persistence.entity.AsyncTaskEntity;

/**
 * 异步任务处理器。每个 taskType 对应一个实现，由 {@link AsyncTaskWorker} 派发执行。
 *
 * <p>实现约定：
 * <ul>
 *   <li>{@link #handle} 抛出异常视为本次执行失败，由 Worker 负责重试/死信。</li>
 *   <li>实现需自行保证幂等（同一任务可能因重试、僵尸任务恢复被多次执行）。</li>
 *   <li>{@link #onDeadLetter} 只在任务进入终态死信后调用，用于业务侧安全降级；回调异常不会改变死信事实。</li>
 * </ul>
 */
public interface AsyncTaskHandler {
    String taskType();

    void handle(AsyncTaskEntity task);

    /**
     * 任务耗尽重试进入 DEAD_LETTER 后的业务补偿钩子。
     *
     * <p>默认无操作，避免通用异步框架强耦合具体业务。需要“死信转人工”等语义的处理器可覆盖。
     */
    default void onDeadLetter(AsyncTaskEntity task, String errorCode, String errorMessage) {
        // no-op
    }
}
