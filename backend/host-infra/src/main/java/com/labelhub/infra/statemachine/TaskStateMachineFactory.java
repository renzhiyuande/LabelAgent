package com.labelhub.infra.statemachine;

import com.labelhub.core.statemachine.StateMachineEngine;

/**
 * 任务状态机工厂
 * 
 * <p>
 * 定义任务生命周期的状态转换规则：
 * <ul>
 * <li>DRAFT（草稿）→ PUBLISH → PUBLISHED（已发布）</li>
 * <li>PUBLISHED（已发布）→ PAUSE → PAUSED（已暂停）</li>
 * <li>PAUSED（已暂停）→ RESUME → PUBLISHED（已发布）</li>
 * <li>DRAFT/PUBLISHED/PAUSED → ARCHIVE → ARCHIVED（已归档）</li>
 * </ul>
 */
public final class TaskStateMachineFactory {
    private TaskStateMachineFactory() {
    }

    /**
     * 创建任务状态机实例
     * 
     * @return 任务状态机引擎
     */
    public static StateMachineEngine<TaskStatus, TaskEvent> createTaskMachine() {
        return StateMachineEngine.<TaskStatus, TaskEvent>builder("TASK_MACHINE")
                .addTransition(TaskStatus.DRAFT, TaskEvent.PUBLISH, TaskStatus.PUBLISHED)
                .addTransition(TaskStatus.PUBLISHED, TaskEvent.PAUSE, TaskStatus.PAUSED)
                .addTransition(TaskStatus.PAUSED, TaskEvent.RESUME, TaskStatus.PUBLISHED)
                .addTransition(TaskStatus.DRAFT, TaskEvent.ARCHIVE, TaskStatus.ARCHIVED)
                .addTransition(TaskStatus.PUBLISHED, TaskEvent.ARCHIVE, TaskStatus.ARCHIVED)
                .addTransition(TaskStatus.PAUSED, TaskEvent.ARCHIVE, TaskStatus.ARCHIVED)
                .build();
    }
}
