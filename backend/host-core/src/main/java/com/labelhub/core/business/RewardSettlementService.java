package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.RewardBatchSummary;
import com.labelhub.core.business.BusinessDtos.RewardDetailRow;
import com.labelhub.core.lowcode.query.ParsedListQuery;

public interface RewardSettlementService {
    PageResponse<RewardBatchSummary> listBatches(Long taskId, ParsedListQuery query);

    RewardBatchSummary getBatch(Long batchId);

    PageResponse<RewardDetailRow> listDetails(Long batchId, ParsedListQuery query);

    RewardDetailRow getDetail(Long batchId, Long detailId);

    /** 扫描任务下可结算的 APPROVED 数据，生成 DRAFT 批次与明细（跨批次防重复计费）。 */
    RewardBatchSummary createBatch(Long taskId);

    /** 某条提交通过后，自动写入当前打开中的奖励批次。 */
    void recordApprovedSubmission(Long submissionId);

    RewardBatchSummary confirmBatch(Long batchId);

    RewardBatchSummary markPaid(Long batchId);

    RewardBatchSummary reverseBatch(Long batchId);

    /** 导出已确认批次的奖励明细到对象存储，回写 exportFileId。 */
    RewardBatchSummary exportBatch(Long batchId);

    PageResponse<RewardDetailRow> listMyRewards(ParsedListQuery query);

    RewardDetailRow getMyReward(Long rewardId);
}
