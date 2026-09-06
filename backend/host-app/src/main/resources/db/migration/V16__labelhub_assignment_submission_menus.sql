-- LabelHub V16: 任务分配与提交记录权限、菜单种子

INSERT IGNORE INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (10010, 1, 0, 0, 'business:assignment:read', 'Read Assignment', 'BUSINESS', '/api/v1/owner/assignments/**', 'ACTIVE'),
  (10011, 1, 0, 0, 'business:assignment:create', 'Create Assignment', 'BUSINESS', '/api/v1/owner/assignments', 'ACTIVE'),
  (10012, 1, 0, 0, 'business:assignment:update', 'Update Assignment', 'BUSINESS', '/api/v1/owner/assignments/**', 'ACTIVE'),
  (10013, 1, 0, 0, 'business:submission:read', 'Read Submission', 'BUSINESS', '/api/v1/owner/submissions/**', 'ACTIVE'),
  (10014, 1, 0, 0, 'business:submission:update', 'Update Submission', 'BUSINESS', '/api/v1/owner/submissions/**', 'ACTIVE');

INSERT IGNORE INTO role_permissions (id, tenant_id, created_by, updated_by, role_id, permission_id, grant_source) VALUES
  (10110, 1, 0, 0, 2001, 10010, 'SYSTEM'),
  (10111, 1, 0, 0, 2001, 10011, 'SYSTEM'),
  (10112, 1, 0, 0, 2001, 10012, 'SYSTEM'),
  (10113, 1, 0, 0, 2001, 10013, 'SYSTEM'),
  (10114, 1, 0, 0, 2001, 10014, 'SYSTEM'),
  (10120, 1, 0, 0, 2002, 10010, 'SYSTEM'),
  (10121, 1, 0, 0, 2002, 10011, 'SYSTEM'),
  (10122, 1, 0, 0, 2002, 10012, 'SYSTEM'),
  (10123, 1, 0, 0, 2002, 10013, 'SYSTEM'),
  (10124, 1, 0, 0, 2002, 10014, 'SYSTEM');

INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (20007, 1, 0, 0, 'owner.assignments', '任务分配', 'MENU', 20001, '/owner/assignments', 'owner-assignments', 'resource/assignments', 'users-check',
   'business:assignment:read', 1, 0, 1, 0, 'INTERNAL', 15, 'ACTIVE'),
  (20008, 1, 0, 0, 'owner.submissions', '提交记录', 'MENU', 20001, '/owner/submissions', 'owner-submissions', 'resource/submissions', 'file-text',
   'business:submission:read', 1, 0, 1, 0, 'INTERNAL', 16, 'ACTIVE');

INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (20107, 1, 0, 0, 2001, 20007, 'VISIBLE'),
  (20108, 1, 0, 0, 2001, 20008, 'VISIBLE'),
  (20117, 1, 0, 0, 2002, 20007, 'VISIBLE'),
  (20118, 1, 0, 0, 2002, 20008, 'VISIBLE');
