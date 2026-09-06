package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import java.util.List;
import java.util.Map;

public interface TaskService {
    PageResponse<TaskSummary> listTasks(ParsedListQuery query);

    PageResponse<TaskSummary> listTasks(int page, int pageSize, String keyword);

    TaskDetail getTaskDetail(Long taskId);

    TaskSummary createTask(TaskCreateCommand command);

    TaskSummary updateTask(Long taskId, TaskUpdateCommand command);

    void publishTask(Long taskId);

    void pauseTask(Long taskId);

    void deleteTask(Long taskId);

    TaskItemImportBatchSummary importTaskItems(Long taskId, TaskItemImportCommand command);

    TemplateVersionSummary saveTemplate(Long taskId, TemplateSaveCommand command);

    List<TaskItemSummary> listTaskItems(Long taskId, int page, int pageSize);

    PageResponse<TaskItemSummary> listTaskItems(ParsedListQuery query);

    PageResponse<TaskAssignmentBoardRow> listAssignmentBoard(Long taskId, ParsedListQuery query);

    TaskItemDetail getTaskItem(Long taskId, Long taskItemId);

    void deleteTaskItem(Long taskItemId);

    void deleteTaskItems(List<Long> taskItemIds);

    TemplateVersionDetail getLatestTemplateVersion(Long taskId);

    PageResponse<TemplateVersionSummary> listTemplateVersions(Long taskId, ParsedListQuery query);

    TemplateVersionDetailFull getTemplateVersionDetail(Long versionId);

    TemplateVersionSummary createDraftFromBase(Long taskId, Long baseVersionId);

    TemplateVersionDetailFull saveDraft(Long versionId, Map<String, Object> schemaJson,
            String reviewPromptTemplate, List<TemplateReviewDimensionSummary> dimensions);

    TemplateVersionDetailFull saveReviewConfig(Long versionId, String reviewPromptTemplate,
            String providerPlatformKey, String modelId, List<ReviewWorkflowLevelInput> reviewWorkflowLevels,
            List<TemplateReviewDimensionSummary> dimensions);

    TemplateVersionSummary publishVersion(Long versionId);

    void setAsCurrent(Long versionId);

    void archiveVersion(Long versionId, String reason);

    VersionDiffResult compareVersions(Long v1Id, Long v2Id);
}
