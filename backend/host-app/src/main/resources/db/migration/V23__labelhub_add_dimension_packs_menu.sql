-- LabelHub V23: 新增维度包管理菜单项（系统管理下）
-- 注意：6011 已在 V18（定时任务）占用，sort_no=90 与 V3 数据权限冲突，此处使用 6013/7022

SET NAMES utf8mb4;

INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES (
  6013, 1, 0, 0, 'system.dimension-packs', '维度包管理', 'MENU', 6001, '/system/dimension-packs', 'system-dimension-packs', 'pages/dimension-packs', 'layers',
  'system:admin', 1, 0, 1, 0, 'INTERNAL', 86, 'ACTIVE'
);

INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (7022, 1, 0, 0, 2002, 6013, 'VISIBLE');
