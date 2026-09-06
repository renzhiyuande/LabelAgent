package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import java.util.List;
import java.util.Map;

public interface AssignmentService {
    PageResponse<AssignmentSummary> listAssignments(ParsedListQuery query);

    AssignmentDetail getAssignmentDetail(Long assignmentId);

    AssignmentSummary createAssignment(AssignmentCreateCommand command);

    AssignmentSummary updateAssignment(Long assignmentId, AssignmentUpdateCommand command);

    List<AssignmentSummary> batchCreateAssignments(AssignmentsBatchCreateCommand command);

    List<AssignmentSummary> batchCancelAssignments(AssignmentsBatchCancelCommand command);

    /** 按题目 itemId 批量取消（分配题目池 Engine bulk，ids 为 task_item.id） */
    void batchCancelAssignmentsByItemIds(List<Long> itemIds, String reason);

    /** 按题目 itemId 批量打开已取消分配（分配题目池 Engine bulk，ids 为 task_item.id） */
    void batchReopenAssignmentsByItemIds(List<Long> itemIds);

    AssignmentSummary claimAssignment(Long assignmentId);

    AssignmentSummary saveDraft(Long assignmentId, Map<String, Object> draftData);

    AssignmentSummary submitAssignment(Long assignmentId);

    AssignmentSummary reopenAssignment(Long assignmentId);

    void cancelAssignment(Long assignmentId, String reason);
}
