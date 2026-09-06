package com.labelhub.infra.business.export.service;

import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.export.ExportFieldCatalogService;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.LowCodeDtos.TreeOptionItem;
import com.labelhub.infra.business.export.support.ExportFieldCatalogSupport;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbExportFieldCatalogService implements ExportFieldCatalogService {

    private final ExportFieldCatalogSupport catalogSupport;

    public DbExportFieldCatalogService(ExportFieldCatalogSupport catalogSupport) {
        this.catalogSupport = catalogSupport;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    public List<OptionItem> listFieldOptions(Long taskId) {
        return catalogSupport.listFieldOptions(taskId);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    public List<TreeOptionItem> listFieldTreeOptions(Long taskId) {
        return catalogSupport.listFieldTreeOptions(taskId);
    }
}
