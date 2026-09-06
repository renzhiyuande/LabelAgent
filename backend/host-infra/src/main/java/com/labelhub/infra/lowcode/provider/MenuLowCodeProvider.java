package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.system.SystemDtos.MenuNode;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeOptionProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.system.admin.MenuAdminService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class MenuLowCodeProvider extends AbstractLowCodeProvider<MenuNode> implements LowCodeOptionProvider {
    private final MenuAdminService menuAdminService;

    public MenuLowCodeProvider(MenuAdminService menuAdminService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.menuAdminService = menuAdminService;
    }

    @Override
    public String resourceKey() {
        return "menus";
    }

    @Override
    public String label() {
        return "菜单";
    }

    @Override
    public Class<MenuNode> summaryType() {
        return MenuNode.class;
    }

    @Override
    public PageResponse<MenuNode> query(ListQuery query) {
        return menuAdminService.listMenus(querySupport.toPageQuery(query));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "enable", id -> menuAdminService.setMenuStatus(id, "ACTIVE"),
                "disable", id -> menuAdminService.setMenuStatus(id, "DISABLED")
        );
    }

    @Override
    public String optionKey() {
        return "menus";
    }

    @Override
    public String optionLabel() {
        return "菜单";
    }

    @Override
    public String requiredPermission() {
        return "system:admin";
    }

    @Override
    public List<OptionItem> options(String keyword) {
        return flatten(menuAdminService.menuTree()).stream()
                .filter(item -> keyword == null || keyword.isBlank() || item.label().contains(keyword))
                .toList();
    }

    private List<OptionItem> flatten(List<MenuNode> roots) {
        List<OptionItem> items = new ArrayList<>();
        for (MenuNode root : roots) {
            items.add(new OptionItem(root.menuName(), root.id()));
            items.addAll(flatten(root.children()));
        }
        return items;
    }
}
