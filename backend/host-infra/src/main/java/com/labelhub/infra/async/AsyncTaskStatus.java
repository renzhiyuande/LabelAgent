package com.labelhub.infra.async;

/**
 * 异步任务状态常量。
 */
public final class AsyncTaskStatus {
    public static final String PENDING = "PENDING";
    public static final String RUNNING = "RUNNING";
    public static final String SUCCESS = "SUCCESS";
    public static final String DEAD_LETTER = "DEAD_LETTER";
    public static final String CANCELED = "CANCELED";

    private AsyncTaskStatus() {
    }
}
