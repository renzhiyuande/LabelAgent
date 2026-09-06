package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.AcceptanceCreateCommand;
import com.labelhub.core.business.BusinessDtos.AcceptanceSampleRow;
import com.labelhub.core.business.BusinessDtos.AcceptanceSummary;
import com.labelhub.core.lowcode.query.ParsedListQuery;

public interface AcceptanceService {
    PageResponse<AcceptanceSummary> listAcceptances(Long taskId, ParsedListQuery query);

    AcceptanceSummary getAcceptance(Long id);

    AcceptanceSummary createAcceptance(AcceptanceCreateCommand command);

    /** 按 sample_rule 对该验收单关联任务的 APPROVED 提交抽样，写入样本表。 */
    AcceptanceSummary generateSamples(Long acceptanceId);

    PageResponse<AcceptanceSampleRow> listSamples(Long acceptanceId, ParsedListQuery query);

    AcceptanceSampleRow getSample(Long acceptanceId, Long sampleId);

    AcceptanceSummary decideSample(Long sampleId, String decision, String comment);

    AcceptanceSummary confirmAcceptance(Long acceptanceId, String comment);

    AcceptanceSummary reopenAcceptance(Long acceptanceId);
}
