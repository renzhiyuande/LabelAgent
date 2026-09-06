package com.labelhub.infra.business.review.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.claimtoken.ClaimTokenPayloadSupport;
import com.labelhub.infra.async.AsyncTaskHandler;
import com.labelhub.infra.auth.AuthenticatedUserLoader;
import com.labelhub.infra.business.review.service.DbReviewerWorkbenchService;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.ReviewBatchOperationEntity;
import com.labelhub.infra.persistence.mapper.ReviewBatchOperationMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class BatchReviewTaskHandler implements AsyncTaskHandler {
    private static final Logger log = LoggerFactory.getLogger(BatchReviewTaskHandler.class);

    private final DbReviewerWorkbenchService reviewerWorkbenchService;
    private final ReviewBatchOperationMapper reviewBatchOperationMapper;
    private final AuthenticatedUserLoader authenticatedUserLoader;
    private final ObjectMapper objectMapper;

    public BatchReviewTaskHandler(
            DbReviewerWorkbenchService reviewerWorkbenchService,
            ReviewBatchOperationMapper reviewBatchOperationMapper,
            AuthenticatedUserLoader authenticatedUserLoader,
            ObjectMapper objectMapper) {
        this.reviewerWorkbenchService = reviewerWorkbenchService;
        this.reviewBatchOperationMapper = reviewBatchOperationMapper;
        this.authenticatedUserLoader = authenticatedUserLoader;
        this.objectMapper = objectMapper;
    }

    @Override
    public String taskType() {
        return "BATCH_REVIEW";
    }

    @Override
    public void handle(AsyncTaskEntity task) {
        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(task.getPayloadJson(), new TypeReference<>() {});
        } catch (Exception ex) {
            throw new RuntimeException("Invalid batch review payload", ex);
        }

        Long batchOpId = ClaimTokenPayloadSupport.readLong(payload, "batchOperationId");
        String action = (String) payload.get("action");
        String commentText = (String) payload.get("commentText");
        Long operatorId = ClaimTokenPayloadSupport.readLong(payload, "operatorId");
        List<Long> submissionIds = ClaimTokenPayloadSupport.readLongList(payload.get("submissionIds"));
        String batchKey = task.getBizKey();

        if (batchOpId == null || operatorId == null) {
            throw new RuntimeException("Invalid batch review payload: missing batchOperationId or operatorId");
        }

        ReviewBatchOperationEntity op = reviewBatchOperationMapper.selectById(batchOpId);
        if (op == null) {
            throw new RuntimeException("Batch operation not found: " + batchOpId);
        }

        op.setStatus("RUNNING");
        op.setStartedAt(Instant.now());
        op.setUpdatedAt(Instant.now());
        reviewBatchOperationMapper.updateById(op);

        int success = 0;
        int failed = 0;
        List<Map<String, Object>> failures = new ArrayList<>();

        AuthenticatedUser operator = authenticatedUserLoader.requireByUserId(operatorId);
        SecurityContext previousContext = SecurityContextHolder.getContext();
        SecurityContext batchContext = SecurityContextHolder.createEmptyContext();
        batchContext.setAuthentication(new UsernamePasswordAuthenticationToken(operator, null, List.of()));
        SecurityContextHolder.setContext(batchContext);

        try {
            for (Long submissionId : submissionIds) {
                try {
                    reviewerWorkbenchService.applyHumanDecision(
                            submissionId, action, commentText, operatorId, batchKey);
                    success++;
                } catch (Exception ex) {
                    failed++;
                    failures.add(Map.of(
                            "submissionId", submissionId,
                            "error", ex.getMessage() == null ? "unknown" : ex.getMessage()));
                    log.warn("Batch review {} failed for submission {}: {}", batchKey, submissionId, ex.getMessage());
                }
            }
        } finally {
            SecurityContextHolder.setContext(previousContext);
            op.setSuccessCount(success);
            op.setFailedCount(failed);
            op.setStatus(failed == 0 ? "SUCCESS" : (success == 0 ? "FAILED" : "PARTIAL"));
            op.setFinishedAt(Instant.now());
            op.setUpdatedAt(Instant.now());
            if (!failures.isEmpty()) {
                try {
                    op.setFailureSummaryJson(objectMapper.writeValueAsString(failures));
                } catch (Exception ex) {
                    log.warn("Failed to serialize batch review failure summary: {}", ex.getMessage());
                }
            }
            reviewBatchOperationMapper.updateById(op);
        }
    }
}
