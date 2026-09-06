-- LabelHub V19: 数据验收 + 奖励结算 权限与菜单种子
-- 生成日期: 2026-05-30
-- 用途: 为新增的验收中心、奖励结算后端模块补充业务权限点、菜单与角色绑定

-- ========================================
-- Step 1: 新增业务权限点
-- ========================================
INSERT INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (10015, 1, 0, 0, 'business:acceptance:manage', 'Manage Acceptance', 'BUSINESS', '/api/v1/owner/acceptances/**', 'ACTIVE'),
  (10016, 1, 0, 0, 'business:reward:manage', 'Manage Reward Settlement', 'BUSINESS', '/api/v1/owner/reward-settlements/**', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  module_code = VALUES(module_code),
  api_pattern = VALUES(api_pattern),
  status = VALUES(status),
  deleted_flag = 0;

-- ========================================
-- Step 2: 授予角色（admin=2002，owner=2001）
-- ========================================
INSERT INTO role_permissions (id, tenant_id, created_by, updated_by, role_id, permission_id, grant_source) VALUES
  (10115, 1, 0, 0, 2001, 10015, 'SYSTEM'),
  (10116, 1, 0, 0, 2001, 10016, 'SYSTEM'),
  (10125, 1, 0, 0, 2002, 10015, 'SYSTEM'),
  (10126, 1, 0, 0, 2002, 10016, 'SYSTEM')
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  permission_id = VALUES(permission_id),
  grant_source = VALUES(grant_source),
  deleted_flag = 0;

-- ========================================
-- Step 3: 验收中心菜单（奖励结算菜单 owner.settlements 已在 V7 建好）
-- ========================================
INSERT INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (20009, 1, 0, 0, 'owner.acceptances', '数据验收', 'MENU', 20001, '/owner/acceptances', 'owner-acceptances', 'pages/owner/acceptances', 'clipboard-check',
   'business:acceptance:manage', 1, 0, 0, 0, 'INTERNAL', 45, 'ACTIVE')
ON DUPLICATE KEY UPDATE
  menu_name = VALUES(menu_name),
  menu_type = VALUES(menu_type),
  parent_id = VALUES(parent_id),
  path = VALUES(path),
  route_name = VALUES(route_name),
  component_path = VALUES(component_path),
  icon = VALUES(icon),
  permission_code = VALUES(permission_code),
  visible_flag = VALUES(visible_flag),
  disabled_flag = VALUES(disabled_flag),
  cache_flag = VALUES(cache_flag),
  affix_flag = VALUES(affix_flag),
  open_mode = VALUES(open_mode),
  sort_no = VALUES(sort_no),
  status = VALUES(status),
  deleted_flag = 0;

-- ========================================
-- Step 4: 菜单授权给 owner 角色（2001）
-- ========================================
INSERT INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (20109, 1, 0, 0, 2001, 20009, 'VISIBLE')
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  menu_id = VALUES(menu_id),
  grant_scope = VALUES(grant_scope),
  deleted_flag = 0;
