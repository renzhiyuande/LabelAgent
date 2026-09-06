package com.labelhub.infra.system.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.system.SystemDtos.MenuCommand;
import com.labelhub.core.system.SystemDtos.MenuNode;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.MenuEntity;
import com.labelhub.infra.persistence.entity.RoleEntity;
import com.labelhub.infra.persistence.entity.RoleMenuEntity;
import com.labelhub.infra.persistence.mapper.MenuMapper;
import com.labelhub.infra.persistence.mapper.RoleMapper;
import com.labelhub.infra.persistence.mapper.RoleMenuMapper;
import com.labelhub.infra.system.admin.mapper.MenuAdminMapper;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class MenuAdminService {
    private final MenuMapper menuMapper;
    private final RoleMapper roleMapper;
    private final RoleMenuMapper roleMenuMapper;
    private final AdminSupport adminSupport;
    private final MenuAdminMapper menuAdminMapper;

    public MenuAdminService(
            MenuMapper menuMapper,
            RoleMapper roleMapper,
            RoleMenuMapper roleMenuMapper,
            AdminSupport adminSupport,
            MenuAdminMapper menuAdminMapper) {
        this.menuMapper = menuMapper;
        this.roleMapper = roleMapper;
        this.roleMenuMapper = roleMenuMapper;
        this.adminSupport = adminSupport;
        this.menuAdminMapper = menuAdminMapper;
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<MenuNode> listMenus(PageQuery query) {
        List<MenuNode> nodes = menuTree();
        return PageResponse.of(nodes.size(), query.normalizedPage(), query.normalizedPageSize(), nodes);
    }

    @RequireAnyPermission({"system:admin"})
    public MenuNode getMenu(Long id) {
        MenuEntity entity = adminSupport.requireEntity(menuMapper.selectById(id), "menu");
        return toMenuNode(entity, List.of());
    }

    @RequireAnyPermission({"system:admin"})
    public List<MenuNode> menuTree() {
        return buildMenuTree(menuMapper.selectList(new LambdaQueryWrapper<MenuEntity>()
                .eq(MenuEntity::getDeletedFlag, 0)
                .orderByAsc(MenuEntity::getSortNo, MenuEntity::getId)));
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "MENU", actionCode = "menu.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public MenuNode createMenu(MenuCommand command) {
        MenuEntity entity = new MenuEntity();
        applyMenuCommand(entity, command);
        entity.setStatus(Status.ACTIVE);
        menuMapper.insert(entity);
        return toMenuNode(entity, List.of());
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "MENU", actionCode = "menu.update", entityId = "#id")
    public MenuNode updateMenu(Long id, MenuCommand command) {
        MenuEntity entity = adminSupport.requireEntity(menuMapper.selectById(id), "menu");
        applyMenuCommand(entity, command);
        menuMapper.updateById(entity);
        return toMenuNode(entity, List.of());
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "MENU", actionCode = "menu.status", entityId = "#id")
    public void setMenuStatus(Long id, String status) {
        MenuEntity entity = adminSupport.requireEntity(menuMapper.selectById(id), "menu");
        entity.setStatus(status);
        menuMapper.updateById(entity);
    }

    public List<MenuNode> currentUserMenus(AuthenticatedUser user) {
        if (user.roles().isEmpty()) {
            return List.of();
        }
        List<RoleEntity> roles = roleMapper.selectList(new LambdaQueryWrapper<RoleEntity>()
                .eq(RoleEntity::getDeletedFlag, 0)
                .eq(RoleEntity::getStatus, Status.ACTIVE)
                .in(RoleEntity::getRoleCode, user.roles()));
        List<Long> roleIds = roles.stream().map(RoleEntity::getId).toList();
        if (roleIds.isEmpty()) {
            return List.of();
        }
        List<RoleMenuEntity> roleMenus = roleMenuMapper.selectList(new LambdaQueryWrapper<RoleMenuEntity>()
                .eq(RoleMenuEntity::getDeletedFlag, 0)
                .in(RoleMenuEntity::getRoleId, roleIds));
        Set<Long> menuIds = roleMenus.stream().map(RoleMenuEntity::getMenuId).collect(Collectors.toSet());
        List<MenuEntity> menus = menuIds.isEmpty()
                ? List.of()
                : menuMapper.selectBatchIds(menuIds).stream()
                .filter(menu -> menu.getDeletedFlag() == 0
                        && Status.ACTIVE.equals(menu.getStatus())
                        && (menu.getVisibleFlag() == null || menu.getVisibleFlag() == 1)
                        && (menu.getDisabledFlag() == null || menu.getDisabledFlag() == 0))
                .sorted(Comparator.comparing(MenuEntity::getSortNo).thenComparing(MenuEntity::getId))
                .toList();
        return buildMenuTree(menus);
    }

    private void applyMenuCommand(MenuEntity entity, MenuCommand command) {
        menuAdminMapper.apply(command, entity);
        entity.setParentId(command.parentId() == null ? 0L : command.parentId());
        entity.setVisibleFlag(Boolean.TRUE.equals(command.visible()) ? 1 : 0);
        entity.setDisabledFlag(Boolean.TRUE.equals(command.disabled()) ? 1 : 0);
        entity.setSortNo(command.sortNo() == null ? 0 : command.sortNo());
        entity.setOpenMode("INTERNAL");
    }

    private List<MenuNode> buildMenuTree(List<MenuEntity> entities) {
        Map<Long, List<MenuNode>> children = new LinkedHashMap<>();
        List<MenuNode> all = entities.stream().map(entity -> toMenuNode(entity, List.of())).toList();
        Map<Long, MenuNode> nodeMap = all.stream().collect(Collectors.toMap(MenuNode::id, Function.identity()));
        for (MenuEntity entity : entities) {
            MenuNode node = nodeMap.get(entity.getId());
            children.computeIfAbsent(entity.getParentId(), ignored -> new ArrayList<>()).add(node);
        }
        return attachChildren(children.getOrDefault(0L, List.of()), children);
    }

    private List<MenuNode> attachChildren(List<MenuNode> roots, Map<Long, List<MenuNode>> children) {
        return roots.stream()
                .map(node -> new MenuNode(node.id(), node.menuCode(), node.menuName(), node.menuType(), node.parentId(),
                        node.path(), node.routeName(), node.componentPath(), node.icon(), node.permissionCode(),
                        node.visible(), node.disabled(), node.sortNo(), node.status(), node.keepAlive(), node.affix(),
                        attachChildren(children.getOrDefault(node.id(), List.of()), children)))
                .toList();
    }

    private MenuNode toMenuNode(MenuEntity entity, List<MenuNode> children) {
        return menuAdminMapper.toNode(entity, children);
    }
}
