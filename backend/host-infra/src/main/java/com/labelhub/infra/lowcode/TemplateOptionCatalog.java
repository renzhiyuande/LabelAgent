package com.labelhub.infra.lowcode;

import com.labelhub.core.lowcode.LowCodeDtos.OptionSourceItem;
import com.labelhub.infra.system.admin.DictAdminService;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * 模板 remoteSelect / remoteTreeSelect 可用的数据源目录。
 * <p>
 * 与 {@link LowCodeProviderRegistry#optionSources()} 分离：后者面向系统管理 low-code 页，
 * 按当前用户 admin 权限过滤；本 catalog 面向 Owner 模板搭建，列出 Labeler 运行时也能加载的来源。
 */
@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class TemplateOptionCatalog {
    private final DictAdminService dictAdminService;
    private final BusinessOptionProviderRegistry businessOptionProviderRegistry;

    public TemplateOptionCatalog(
            DictAdminService dictAdminService,
            BusinessOptionProviderRegistry businessOptionProviderRegistry) {
        this.dictAdminService = dictAdminService;
        this.businessOptionProviderRegistry = businessOptionProviderRegistry;
    }

    public List<OptionSourceItem> listSources() {
        List<OptionSourceItem> sources = new ArrayList<>(dictAdminService.listActiveDictOptionSources());
        sources.addAll(businessOptionProviderRegistry.optionSources());
        return List.copyOf(sources);
    }
}
