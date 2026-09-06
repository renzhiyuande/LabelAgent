package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.TemplateVersionSummary;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.business.TemplatesService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.query.spec.TemplateVersionQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TemplateVersionLowCodeProvider extends AbstractLowCodeProvider<TemplateVersionSummary> {
    private final TemplatesService templatesService;
    private final TaskService taskService;

    public TemplateVersionLowCodeProvider(
            TemplatesService templatesService,
            TaskService taskService,
            LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.templatesService = templatesService;
        this.taskService = taskService;
    }

    @Override
    public String resourceKey() {
        return "templateVersions";
    }

    @Override
    public String label() {
        return "标注模板版本";
    }

    @Override
    public Class<TemplateVersionSummary> summaryType() {
        return TemplateVersionSummary.class;
    }

    @Override
    public PageResponse<TemplateVersionSummary> query(ListQuery query) {
        ParsedListQuery parsed = querySupport.parse(query, TemplateVersionQuerySpec.build());
        Long templateId = extractLongFilter(parsed, "templateId");
        if (templateId != null) {
            return templatesService.listTemplateVersions(templateId, parsed);
        }
        Long taskId = extractLongFilter(parsed, "taskId");
        if (taskId != null) {
            return taskService.listTemplateVersions(taskId, parsed);
        }
        return PageResponse.empty();
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "publish", id -> templatesService.publishTemplateVersion(id),
                "rollback", id -> templatesService.activateTemplateVersion(id),
                "setAsCurrent", id -> templatesService.activateTemplateVersion(id),
                "archive", id -> taskService.archiveVersion(id, "手动归档"));
    }

    private Long extractLongFilter(ParsedListQuery parsed, String fieldName) {
        for (ParsedFilter filter : parsed.filters()) {
            if (!fieldName.equals(filter.field())) {
                continue;
            }
            Object value = filter.value();
            if (value instanceof Number number) {
                return number.longValue();
            }
            if (value instanceof String text && !text.isBlank()) {
                return Long.parseLong(text);
            }
        }
        return null;
    }
}
