package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.QuotaReleaseBatchSummary;
import com.labelhub.core.business.BusinessDtos.QuotaReleaseCommand;
import com.labelhub.core.lowcode.query.ParsedListQuery;

public interface QuotaReleaseService {
    /** QUOTA 任务放量：落批次记录 + Redis 库存累加（INCRBY），返回本批结果。 */
    QuotaReleaseBatchSummary releaseQuota(Long taskId, QuotaReleaseCommand command);

    PageResponse<QuotaReleaseBatchSummary> listReleaseBatches(Long taskId, ParsedListQuery query);
}
