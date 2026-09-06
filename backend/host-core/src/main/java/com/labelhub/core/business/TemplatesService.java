package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import java.util.List;

public interface TemplatesService {
    PageResponse<TemplateSummary> listTemplates(ParsedListQuery query);

    PageResponse<TemplateSummary> listTemplatesByTaskId(Long taskId, ParsedListQuery query);

    TemplateDetail getTemplateDetail(Long templateId);

    TemplateSummary createTemplate(TemplateCreateCommand command);

    TemplateSummary updateTemplate(Long templateId, TemplateUpdateCommand command);

    void deleteTemplate(Long templateId);

    PageResponse<TemplateVersionSummary> listTemplateVersions(Long templateId, ParsedListQuery query);

    TemplateVersionOwnerDetail getTemplateVersionDetail(Long versionId);

    TemplateVersionSummary createDraftVersion(Long templateId, Long baseVersionId);

    TemplateVersionOwnerDetail saveVersionDraft(Long versionId, TemplateVersionDraftSaveCommand command);

    TemplateVersionSummary publishTemplateVersion(Long versionId);

    TemplateVersionSummary submitTemplateVersionToMarket(Long versionId, String description);

    void activateTemplateVersion(Long versionId);

    void incrementLatestVersionNo(Long templateId);

    void setCurrentVersion(Long templateId, Long versionId);
}
