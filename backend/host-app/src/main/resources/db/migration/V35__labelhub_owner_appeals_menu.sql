-- LabelHub V35: Owner 申诉记录菜单种子
-- 用途: 为 ownerAppeals 低代码资源页注入侧栏菜单与角色可见性（复用 business:task:read 权限）

INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (20011, 1, 0, 0, 'owner.appeals', '申诉记录', 'MENU', 20001, '/owner/appeals', 'owner-appeals', 'resource/ownerAppeals', 'scale',
   'business:task:read', 1, 0, 1, 0, 'INTERNAL', 17, 'ACTIVE');

INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (20111, 1, 0, 0, 2001, 20011, 'VISIBLE'),
  (20112, 1, 0, 0, 2002, 20011, 'VISIBLE');
