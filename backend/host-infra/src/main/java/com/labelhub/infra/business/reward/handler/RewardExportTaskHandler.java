package com.labelhub.infra.business.reward.handler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.infra.async.AsyncTaskHandler;
import com.labelhub.infra.business.storage.service.MinioFileStorageService;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.RewardSettlementBatchEntity;
import com.labelhub.infra.persistence.entity.RewardSettlementDetailEntity;
import com.labelhub.infra.persistence.mapper.RewardSettlementBatchMapper;
import com.labelhub.infra.persistence.mapper.RewardSettlementDetailMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 奖励明细异步导出处理器。生成已确认批次的明细 CSV，上传 MinIO，回写 batch.export_file_id。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class RewardExportTaskHandler implements AsyncTaskHandler {
    private static final Logger log = LoggerFactory.getLogger(RewardExportTaskHandler.class);
    public static final String TASK_TYPE = "REWARD_EXPORT";

    private final RewardSettlementBatchMapper batchMapper;
    private final RewardSettlementDetailMapper detailMapper;
    private final MinioFileStorageService fileStorageService;

    public RewardExportTaskHandler(RewardSettlementBatchMapper batchMapper,
            RewardSettlementDetailMapper detailMapper, MinioFileStorageService fileStorageService) {
        this.batchMapper = batchMapper;
        this.detailMapper = detailMapper;
        this.fileStorageService = fileStorageService;
    }

    @Override
    public String taskType() {
        return TASK_TYPE;
    }

    @Override
    public void handle(AsyncTaskEntity task) {
        Long batchId = task.getBizId();
        RewardSettlementBatchEntity batch = batchMapper.selectById(batchId);
        if (batch == null || batch.getDeletedFlag() == 1) {
            log.warn("Reward batch not found, skip export: {}", batchId);
            return;
        }
        if (batch.getExportFileId() != null) {
            return;
        }

        List<RewardSettlementDetailEntity> details = detailMapper.selectList(
                new LambdaQueryWrapper<RewardSettlementDetailEntity>()
                        .eq(RewardSettlementDetailEntity::getBatchId, batchId)
                        .eq(RewardSettlementDetailEntity::getDeletedFlag, 0)
                        .orderByAsc(RewardSettlementDetailEntity::getId));
        byte[] content = toCsv(details);
        Long fileId = fileStorageService.upload(content, batch.getBatchNo() + ".csv", "text/csv",
                "REWARD_DETAIL", batch.getConfirmedBy());

        batch.setExportFileId(fileId);
        batch.setUpdatedAt(Instant.now());
        batchMapper.updateById(batch);
        log.info("Reward batch {} exported, fileId={}", batchId, fileId);
    }

    private byte[] toCsv(List<RewardSettlementDetailEntity> details) {
        StringBuilder sb = new StringBuilder();
        sb.append("detailId,userId,submissionId,submissionVersionId,assignmentId,currency,amount,status\n");
        for (RewardSettlementDetailEntity d : details) {
            sb.append(d.getId()).append(',')
                    .append(d.getUserId()).append(',')
                    .append(d.getSubmissionId()).append(',')
                    .append(d.getSubmissionVersionId()).append(',')
                    .append(d.getAssignmentId()).append(',')
                    .append(d.getCurrencyCode()).append(',')
                    .append(d.getAmount()).append(',')
                    .append(d.getStatus()).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }
}
