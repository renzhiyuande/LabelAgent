package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.system.SystemDtos.DictItemSummary;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.DictAdminService;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DictItemLowCodeProvider extends AbstractLowCodeProvider<DictItemSummary> {
    private final DictAdminService dictAdminService;

    public DictItemLowCodeProvider(DictAdminService dictAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.dictAdminService = dictAdminService;
    }

    @Override
    public String resourceKey() {
        return "dictItems";
    }

    @Override
    public String label() {
        return "字典项";
    }

    @Override
    public Class<DictItemSummary> summaryType() {
        return DictItemSummary.class;
    }

    @Override
    public PageResponse<DictItemSummary> query(ListQuery query) {
        Long dictTypeId = querySupport.requireLongFilter(query.filters(), "dictTypeId");
        return dictAdminService.listDictItems(dictTypeId, querySupport.toPageQuery(query));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "enable", id -> dictAdminService.setDictItemStatus(id, "ACTIVE"),
                "disable", id -> dictAdminService.setDictItemStatus(id, "DISABLED"),
                "delete", dictAdminService::deleteDictItem
        );
    }
}
