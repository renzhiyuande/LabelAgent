package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import com.labelhub.infra.system.admin.DictAdminService;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DictTypeLowCodeOptionProvider implements LowCodeOptionProvider {
    private final DictAdminService dictAdminService;

    public DictTypeLowCodeOptionProvider(DictAdminService dictAdminService) {
        this.dictAdminService = dictAdminService;
    }

    @Override
    public String optionKey() {
        return "dictTypes";
    }

    @Override
    @Cacheable(value = "dictTypes", key = "#keyword == null ? '__all__' : #keyword")
    public List<OptionItem> options(String keyword) {
        return dictAdminService.listDictTypes(new PageQuery(1, 100, keyword)).list().stream()
                .map(item -> new OptionItem(item.dictName(), item.id()))
                .toList();
    }
}
