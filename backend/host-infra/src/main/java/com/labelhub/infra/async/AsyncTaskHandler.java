package com.labelhub.infra.async;

import com.labelhub.infra.persistence.entity.AsyncTaskEntity;

/**
 * 异步任务处理器。每个 taskType 对应一个实现，由 {@link AsyncTaskWorker} 派发执行。
 *
 * <p>实现约定：
 * <ul>
 *   <li>{@link #handle} 抛出异常视为本次执行失败，由 Worker 负责重试/死信。</li>
 *   <li>实现需自行保证幂等（同一任务可能因重试被多次执行）。</li>
 * </ul>
 */
public interface AsyncTaskHandler {
    String taskType();

    void handle(AsyncTaskEntity task);
}
