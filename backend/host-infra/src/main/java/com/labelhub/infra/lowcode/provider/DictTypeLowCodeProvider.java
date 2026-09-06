package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.SystemDtos.DictTypeSummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.DictAdminService;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DictTypeLowCodeProvider extends AbstractLowCodeProvider<DictTypeSummary> {
    private final DictAdminService dictAdminService;

    public DictTypeLowCodeProvider(DictAdminService dictAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.dictAdminService = dictAdminService;
    }

    @Override
    public String resourceKey() {
        return "dictTypes";
    }

    @Override
    public String label() {
        return "字典类型";
    }

    @Override
    public Class<DictTypeSummary> summaryType() {
        return DictTypeSummary.class;
    }

    @Override
    public PageResponse<DictTypeSummary> query(ListQuery query) {
        return dictAdminService.listDictTypes(querySupport.parse(query));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "enable", id -> dictAdminService.setDictTypeStatus(id, "ACTIVE"),
                "disable", id -> dictAdminService.setDictTypeStatus(id, "DISABLED"),
                "delete", dictAdminService::deleteDictType
        );
    }
}
