package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TaskMemberSummary;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import java.util.List;

public interface TaskMemberService {
    PageResponse<TaskMemberSummary> listTaskMembers(ParsedListQuery query);

    TaskMemberSummary getTaskMember(Long id);

    TaskMemberSummary addTaskMember(Long taskId, Long userId, String memberRole);

    void removeTaskMember(Long id);

    List<String> getUserTaskPermissions(Long userId, Long taskId);
}
