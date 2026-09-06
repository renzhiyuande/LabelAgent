-- LabelHub V28: 素材库管理菜单（系统管理下）

SET NAMES utf8mb4;

INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES (
  6015, 1, 0, 0, 'system.file-assets', '素材库管理', 'MENU', 6001, '/system/file-assets', 'system-file-assets', 'resource/fileAssets', 'folder-open',
  'system:file:read', 1, 0, 1, 0, 'INTERNAL', 87, 'ACTIVE'
);

INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (7026, 1, 0, 0, 2001, 6015, 'VISIBLE'),
  (7027, 1, 0, 0, 2002, 6015, 'VISIBLE'),
  (7028, 1, 0, 0, 2003, 6015, 'VISIBLE'),
  (7029, 1, 0, 0, 2004, 6015, 'VISIBLE');
