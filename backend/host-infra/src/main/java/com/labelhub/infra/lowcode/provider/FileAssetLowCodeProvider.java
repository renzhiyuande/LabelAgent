package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.FileAssetService;
import com.labelhub.core.system.SystemDtos.FileAssetSummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.LowCodeResourceAction;
import com.labelhub.infra.lowcode.query.spec.FileAssetQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class FileAssetLowCodeProvider extends AbstractLowCodeProvider<FileAssetSummary> {
    private final FileAssetService fileAssetService;

    public FileAssetLowCodeProvider(FileAssetService fileAssetService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.fileAssetService = fileAssetService;
    }

    @Override
    public String resourceKey() {
        return "fileAssets";
    }

    @Override
    public String label() {
        return "素材库";
    }

    @Override
    public Class<FileAssetSummary> summaryType() {
        return FileAssetSummary.class;
    }

    @Override
    public PageResponse<FileAssetSummary> query(ListQuery query) {
        return fileAssetService.listFiles(querySupport.parse(query, FileAssetQuerySpec.build()));
    }

    @Override
    public Map<String, LowCodeResourceAction> actions() {
        return Map.of("delete", id -> fileAssetService.deleteFile(id));
    }
}
