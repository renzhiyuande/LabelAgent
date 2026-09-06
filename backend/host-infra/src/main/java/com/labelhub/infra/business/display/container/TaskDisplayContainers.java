package com.labelhub.infra.business.display.container;

import cn.crane4j.annotation.ContainerMethod;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import java.util.Collection;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TaskDisplayContainers {
    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;

    public TaskDisplayContainers(TaskMapper taskMapper, TaskItemMapper taskItemMapper) {
        this.taskMapper = taskMapper;
        this.taskItemMapper = taskItemMapper;
    }

    @ContainerMethod(
            namespace = DisplayContainerNamespaces.TASK,
            resultType = TaskEntity.class,
            resultKey = "id")
    public List<TaskEntity> listTasksByIds(Collection<Long> ids) {
        return DisplayContainerBatchLoader.loadSoftDeleted(taskMapper, ids);
    }

    @ContainerMethod(
            namespace = DisplayContainerNamespaces.TASK_ITEM,
            resultType = TaskItemEntity.class,
            resultKey = "id")
    public List<TaskItemEntity> listTaskItemsByIds(Collection<Long> ids) {
        return DisplayContainerBatchLoader.loadSoftDeleted(taskItemMapper, ids);
    }
}
