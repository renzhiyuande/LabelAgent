-- LabelHub V17: 「我的任务」菜单种子（按 task 聚合的标注员视图），共享既有 business:labeler:workbench 权限
-- 注意：不新增任何业务表/列，仅注入菜单 + 角色可见性

INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (30005, 1, 0, 0, 'labeler.my-tasks', '我的任务', 'MENU', 30001, '/labeler/my-tasks', 'labeler-my-tasks', 'pages/labeler/my-tasks', 'list-checks',
   'business:labeler:workbench', 1, 0, 0, 0, 'INTERNAL', 15, 'ACTIVE');

INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (30105, 1, 0, 0, 2003, 30005, 'VISIBLE');
