package com.labelhub.core.business;

import java.util.List;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.ReviewBatchOperationRow;
import com.labelhub.core.business.BusinessDtos.AiQueueStatsSummary;
import com.labelhub.core.business.BusinessDtos.AiQueueStatusCounts;
import com.labelhub.core.business.BusinessDtos.ReviewerAiQueueAdvanceCommand;
import com.labelhub.core.business.BusinessDtos.ReviewerBatchDecisionCommand;
import com.labelhub.core.business.BusinessDtos.ReviewerBatchSubmitResult;
import com.labelhub.core.business.BusinessDtos.ReviewerDecisionCommand;
import com.labelhub.core.business.BusinessDtos.AuditPoolGroupRow;
import com.labelhub.core.business.BusinessDtos.AuditPoolMetaSummary;
import com.labelhub.core.business.BusinessDtos.ReviewerQueueRow;
import com.labelhub.core.business.BusinessDtos.ReviewerReviewRecordDetail;
import com.labelhub.core.business.BusinessDtos.ReviewerReviewRecordListRow;
import com.labelhub.core.business.BusinessDtos.ReviewerReviewRecordRow;
import com.labelhub.core.business.BusinessDtos.ReviewerSubmissionDetail;
import java.time.Instant;
import com.labelhub.core.lowcode.query.ParsedListQuery;

public interface ReviewerWorkbenchService {
    PageResponse<ReviewerQueueRow> listAiQueue(ParsedListQuery query, String queueStatus);

    ReviewerSubmissionDetail getAiQueueDetail(Long submissionId);

    ReviewerSubmissionDetail advanceAiQueue(Long submissionId, ReviewerAiQueueAdvanceCommand command);

    AiQueueStatsSummary listAiQueueStats(Long taskId);

    AiQueueStatusCounts listAiQueueStatusCounts();

    ReviewerSubmissionDetail retryAiQueueReview(Long submissionId);

    PageResponse<ReviewerQueueRow> listAuditPool(
            ParsedListQuery query, String scopeType, List<Long> scopeIds, String reviewLevel);

    PageResponse<AuditPoolGroupRow> listAuditPoolGroups(ParsedListQuery query, String groupBy, String reviewLevel);

    AuditPoolMetaSummary getAuditPoolMeta(Long taskId);

    /** 审核结果筛选用：来自任务 review_workflow_json；无 taskId 时聚合可访问任务的工作流级别。 */
    List<BusinessDtos.AuditPoolLevelCount> listReviewLevelOptions(Long taskId);

    /** 审核工作台任务下拉：按 REVIEW 数据范围（task_member 等）过滤，非 Owner 全量任务列表。 */
    List<BusinessDtos.TaskOptionRow> listAccessibleTaskOptions(String keyword);

    ReviewerSubmissionDetail getAuditPoolDetail(Long submissionId);

    List<ReviewerReviewRecordRow> listSubmissionReviewRecords(Long submissionId);

    PageResponse<ReviewerReviewRecordListRow> listReviewRecords(
            ParsedListQuery query,
            Long taskId,
            String reviewLevel,
            String action,
            Instant decidedFrom,
            Instant decidedTo);

    ReviewerReviewRecordDetail getReviewRecordDetail(Long id);

    ReviewerSubmissionDetail approve(Long submissionId, ReviewerDecisionCommand command);

    ReviewerSubmissionDetail reject(Long submissionId, ReviewerDecisionCommand command);

    ReviewerSubmissionDetail returnForRevision(Long submissionId, ReviewerDecisionCommand command);

    ReviewerBatchSubmitResult submitBatchDecision(ReviewerBatchDecisionCommand command);

    ReviewBatchOperationRow getBatchOperation(String batchKey);
}
