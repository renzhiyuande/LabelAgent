-- LabelHub V24: 新增模板市场菜单项
-- 用户模板市场（Owner 菜单下 20010）+ 管理员审核入口（系统管理下 6014）

SET NAMES utf8mb4;

INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES (
  20010, 1, 0, 0, 'owner.template-market', '模板市场', 'MENU', 20001, '/owner/template-market', 'owner-template-market', 'pages/template-market', 'store',
  NULL, 1, 0, 1, 0, 'INTERNAL', 13, 'ACTIVE'
);

INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES (
  6014, 1, 0, 0, 'system.template-market-admin', '模板市场管理', 'MENU', 6001, '/system/template-market-admin', 'system-template-market-admin', 'pages/template-market-admin', 'shield-check',
  'template:market:audit', 1, 0, 1, 0, 'INTERNAL', 95, 'ACTIVE'
);

-- 模板市场挂载到 Owner 菜单树，授予 Owner / Admin 可见
INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (20110, 1, 0, 0, 2001, 20010, 'VISIBLE'),
  (20119, 1, 0, 0, 2002, 20010, 'VISIBLE');

-- 模板市场审核仅授予 ADMIN（V13 已绑定 template:market:audit）
INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (7025, 1, 0, 0, 2002, 6014, 'VISIBLE');
