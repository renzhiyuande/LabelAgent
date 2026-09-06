package com.labelhub.infra.business.submission.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealDecisionCommand;
import com.labelhub.core.claimtoken.ClaimTokenPayloadSupport;
import com.labelhub.infra.async.AsyncTaskHandler;
import com.labelhub.infra.business.submission.workflow.SubmissionAppealLifecycle;
import com.labelhub.infra.persistence.entity.AppealBatchOperationEntity;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.SubmissionAppealEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AppealBatchOperationMapper;
import com.labelhub.infra.persistence.mapper.SubmissionAppealMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class BatchAppealTaskHandler implements AsyncTaskHandler {
    private static final Logger log = LoggerFactory.getLogger(BatchAppealTaskHandler.class);

    private final SubmissionMapper submissionMapper;
    private final SubmissionAppealMapper submissionAppealMapper;
    private final AppealBatchOperationMapper appealBatchOperationMapper;
    private final SubmissionAppealLifecycle submissionAppealLifecycle;
    private final ObjectMapper objectMapper;

    public BatchAppealTaskHandler(
            SubmissionMapper submissionMapper,
            SubmissionAppealMapper submissionAppealMapper,
            AppealBatchOperationMapper appealBatchOperationMapper,
            SubmissionAppealLifecycle submissionAppealLifecycle,
            ObjectMapper objectMapper) {
        this.submissionMapper = submissionMapper;
        this.submissionAppealMapper = submissionAppealMapper;
        this.appealBatchOperationMapper = appealBatchOperationMapper;
        this.submissionAppealLifecycle = submissionAppealLifecycle;
        this.objectMapper = objectMapper;
    }

    @Override
    public String taskType() {
        return "BATCH_APPEAL";
    }

    @Override
    public void handle(AsyncTaskEntity task) {
        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(task.getPayloadJson(), new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new RuntimeException("Invalid batch appeal payload", ex);
        }
        Long batchOperationId = ClaimTokenPayloadSupport.readLong(payload, "batchOperationId");
        String action = String.valueOf(payload.get("action"));
        String batchKey = task.getBizKey();
        if (batchOperationId == null) {
            throw new RuntimeException("Invalid batch appeal payload: missing batchOperationId");
        }

        AppealBatchOperationEntity operation = appealBatchOperationMapper.selectById(batchOperationId);
        if (operation == null) {
            throw new RuntimeException("Appeal batch operation not found: " + batchOperationId);
        }
        operation.setStatus("RUNNING");
        operation.setStartedAt(Instant.now());
        operation.setUpdatedAt(Instant.now());
        appealBatchOperationMapper.updateById(operation);

        int success = 0;
        int failed = 0;
        List<Map<String, Object>> failures = new ArrayList<>();
        if ("SUBMIT_APPEAL".equals(action)) {
            String reasonText = payload.get("reasonText") == null ? null : String.valueOf(payload.get("reasonText"));
            List<Long> submissionIds = ClaimTokenPayloadSupport.readLongList(payload.get("submissionIds"));
            for (Long submissionId : submissionIds) {
                try {
                    SubmissionEntity submission = submissionMapper.selectById(submissionId);
                    submissionAppealLifecycle.submitAppeal(submission, reasonText, batchKey);
                    success++;
                } catch (Exception ex) {
                    failed++;
                    failures.add(Map.of("submissionId", submissionId, "error", safeMessage(ex)));
                    log.warn("Batch appeal {} failed for submission {}: {}", batchKey, submissionId, ex.getMessage());
                }
            }
        } else if ("DECIDE_APPEAL".equals(action)) {
            String decision = String.valueOf(payload.get("decision"));
            String decisionReasonText = payload.get("decisionReasonText") == null
                    ? null
                    : String.valueOf(payload.get("decisionReasonText"));
            Long operatorId = ClaimTokenPayloadSupport.readLong(payload, "operatorId");
            if (operatorId == null) {
                throw new RuntimeException("Invalid batch appeal payload: missing operatorId");
            }
            List<Long> appealIds = ClaimTokenPayloadSupport.readLongList(payload.get("appealIds"));
            for (Long appealId : appealIds) {
                try {
                    SubmissionAppealEntity appeal = submissionAppealMapper.selectById(appealId);
                    submissionAppealLifecycle.decideAppeal(
                            appeal,
                            new SubmissionAppealDecisionCommand(decision, decisionReasonText),
                            operatorId,
                            batchKey);
                    success++;
                } catch (Exception ex) {
                    failed++;
                    failures.add(Map.of("appealId", appealId, "error", safeMessage(ex)));
                    log.warn("Batch appeal decision {} failed for appeal {}: {}", batchKey, appealId, ex.getMessage());
                }
            }
        } else {
            throw new RuntimeException("Unsupported batch appeal action: " + action);
        }

        operation.setSuccessCount(success);
        operation.setFailedCount(failed);
        operation.setStatus(failed == 0 ? "SUCCESS" : (success == 0 ? "FAILED" : "PARTIAL"));
        operation.setFinishedAt(Instant.now());
        operation.setUpdatedAt(Instant.now());
        if (!failures.isEmpty()) {
            try {
                operation.setFailureSummaryJson(objectMapper.writeValueAsString(failures));
            } catch (Exception ex) {
                log.warn("Failed to serialize batch appeal failure summary: {}", ex.getMessage());
            }
        }
        appealBatchOperationMapper.updateById(operation);
    }

    private String safeMessage(Exception ex) {
        return ex.getMessage() == null ? "unknown" : ex.getMessage();
    }
}
