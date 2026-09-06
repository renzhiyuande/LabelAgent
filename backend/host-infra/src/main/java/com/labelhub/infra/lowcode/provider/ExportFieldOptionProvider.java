package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.business.export.ExportFieldCatalogService;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.LowCodeDtos.TreeOptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import com.labelhub.infra.lowcode.TreeLowCodeOptionProvider;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ExportFieldOptionProvider implements TreeLowCodeOptionProvider {

    private final ExportFieldCatalogService exportFieldCatalogService;

    public ExportFieldOptionProvider(ExportFieldCatalogService exportFieldCatalogService) {
        this.exportFieldCatalogService = exportFieldCatalogService;
    }

    @Override
    public String optionKey() {
        return "exportFields";
    }

    @Override
    public String optionLabel() {
        return "导出字段";
    }

    @Override
    public String requiredPermission() {
        return "business:export:manage";
    }

    @Override
    public List<OptionItem> options(OptionRequest request) {
        Long taskId = resolveTaskId(request);
        if (taskId == null) {
            return List.of();
        }
        return exportFieldCatalogService.listFieldOptions(taskId);
    }

    @Override
    public List<TreeOptionItem> treeOptions(OptionRequest request) {
        Long taskId = resolveTaskId(request);
        if (taskId == null) {
            return List.of();
        }
        return exportFieldCatalogService.listFieldTreeOptions(taskId);
    }

    @Override
    public List<OptionItem> options(String keyword) {
        return options(OptionRequest.of(keyword == null ? java.util.Map.of() : java.util.Map.of("keyword", keyword)));
    }

    @Override
    public List<TreeOptionItem> treeOptions(String keyword) {
        return treeOptions(OptionRequest.of(keyword == null ? java.util.Map.of() : java.util.Map.of("keyword", keyword)));
    }

    private Long resolveTaskId(OptionRequest request) {
        String raw = request.get("taskId");
        if (raw == null || raw.isBlank()) {
            raw = request.keyword();
        }
        if (raw == null || !raw.matches("\\d{8,}")) {
            return null;
        }
        return Long.parseLong(raw);
    }
}
