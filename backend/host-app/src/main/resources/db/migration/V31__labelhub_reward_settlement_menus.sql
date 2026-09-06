-- 奖励结算菜单补齐：Owner 入口修正 + Labeler 我的奖励

UPDATE sys_menus
SET component_path = 'resource/rewardSettlements',
    permission_code = 'business:reward:manage'
WHERE tenant_id = 1 AND menu_code = 'owner.settlements' AND deleted_flag = 0;

INSERT INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (30015, 1, 0, 0, 'labeler.my-rewards', '我的奖励', 'MENU', 30001, '/labeler/my-rewards', 'labeler-my-rewards',
   'resource/labelerMyRewards', 'wallet', 'business:labeler:workbench', 1, 0, 1, 0, 'INTERNAL', 40, 'ACTIVE')
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

INSERT INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (30115, 1, 0, 0, 2003, 30015, 'VISIBLE')
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  menu_id = VALUES(menu_id),
  grant_scope = VALUES(grant_scope),
  deleted_flag = 0;
