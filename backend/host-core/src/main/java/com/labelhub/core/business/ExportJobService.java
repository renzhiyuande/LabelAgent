package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.ExportJobCreateCommand;
import com.labelhub.core.business.BusinessDtos.ExportJobDownload;
import com.labelhub.core.business.BusinessDtos.ExportJobSummary;
import com.labelhub.core.lowcode.query.ParsedListQuery;

public interface ExportJobService {
    PageResponse<ExportJobSummary> listExportJobs(Long taskId, ParsedListQuery query);

    ExportJobSummary getExportJob(Long id);

    ExportJobSummary createExportJob(ExportJobCreateCommand command);

    ExportJobDownload downloadExportJob(Long id);
}
