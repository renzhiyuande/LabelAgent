package com.labelhub.core.review;

import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityOverview;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityRecordDetail;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityRecordPage;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilitySummary;

public interface AiReviewObservabilityQueryService {
    AiReviewObservabilityOverview adminOverview(int trendHours);

    AiReviewObservabilityRecordPage adminRecords(
            int page,
            int size,
            Long taskId,
            String status,
            String modelId,
            String verdict);

    AiReviewObservabilityRecordDetail adminRecordDetail(Long aiReviewId);

    AiReviewObservabilityOverview ownerOverview(int trendHours);

    AiReviewObservabilityRecordPage ownerRecords(
            int page,
            int size,
            Long taskId,
            String status,
            String modelId,
            String verdict);

    AiReviewObservabilityRecordDetail ownerRecordDetail(Long aiReviewId);

    AiReviewObservabilitySummary adminSummary();

    AiReviewObservabilitySummary ownerSummary();
}
