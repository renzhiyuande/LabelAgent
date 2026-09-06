INSERT INTO users (
  id, tenant_id, created_by, updated_by, username, password_hash, display_name, email, phone, status, register_source
) VALUES (
  1001, 1, 0, 0, 'admin', '$2y$10$1RfoZFIzbXcHyq0LBGbloeddaFT.RswgBtOWxROPvGN4cdAL4ToTi', 'Platform Admin',
  'admin@labelhub.local', '13800000000', 'ACTIVE', 'WEB'
);

INSERT INTO roles (id, tenant_id, created_by, updated_by, role_code, role_name, status, remark) VALUES
  (2001, 1, 0, 0, 'OWNER', 'Owner', 'ACTIVE', 'Platform owner'),
  (2002, 1, 0, 0, 'ADMIN', 'Admin', 'ACTIVE', 'System administrator'),
  (2003, 1, 0, 0, 'LABELER', 'Labeler', 'ACTIVE', 'Labeling operator'),
  (2004, 1, 0, 0, 'REVIEWER', 'Reviewer', 'ACTIVE', 'Review operator');

INSERT INTO user_roles (id, tenant_id, created_by, updated_by, user_id, role_id) VALUES
  (3001, 1, 0, 0, 1001, 2001),
  (3002, 1, 0, 0, 1001, 2002);

INSERT INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (4001, 1, 0, 0, 'system:admin', 'System Administration', 'SYSTEM', '/api/v1/admin/**', 'ACTIVE'),
  (4002, 1, 0, 0, 'system:menu:read', 'Read Menus', 'SYSTEM', '/api/v1/system/menus', 'ACTIVE'),
  (4003, 1, 0, 0, 'system:dict:read', 'Read Dictionaries', 'SYSTEM', '/api/v1/system/dicts/**', 'ACTIVE');

INSERT INTO role_permissions (id, tenant_id, created_by, updated_by, role_id, permission_id, grant_source) VALUES
  (5001, 1, 0, 0, 2001, 4001, 'SYSTEM'),
  (5002, 1, 0, 0, 2001, 4002, 'SYSTEM'),
  (5003, 1, 0, 0, 2001, 4003, 'SYSTEM'),
  (5004, 1, 0, 0, 2002, 4001, 'SYSTEM'),
  (5005, 1, 0, 0, 2002, 4002, 'SYSTEM'),
  (5006, 1, 0, 0, 2002, 4003, 'SYSTEM'),
  (5007, 1, 0, 0, 2003, 4002, 'SYSTEM'),
  (5008, 1, 0, 0, 2004, 4002, 'SYSTEM');

INSERT INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (6001, 1, 0, 0, 'system.root', 'System', 'MENU', 0, '/system', 'system', 'layouts/SystemLayout', 'settings',
   'system:menu:read', 1, 0, 0, 0, 'INTERNAL', 1, 'ACTIVE'),
  (6002, 1, 0, 0, 'system.users', 'Users', 'MENU', 6001, '/system/users', 'system-users', 'pages/users', 'users',
   'system:admin', 1, 0, 0, 0, 'INTERNAL', 10, 'ACTIVE'),
  (6003, 1, 0, 0, 'system.roles', 'Roles', 'MENU', 6001, '/system/roles', 'system-roles', 'pages/roles', 'shield',
   'system:admin', 1, 0, 0, 0, 'INTERNAL', 20, 'ACTIVE'),
  (6004, 1, 0, 0, 'system.permissions', 'Permissions', 'MENU', 6001, '/system/permissions', 'system-permissions', 'pages/permissions', 'key-round',
   'system:admin', 1, 0, 0, 0, 'INTERNAL', 30, 'ACTIVE'),
  (6005, 1, 0, 0, 'system.menus', 'Menus', 'MENU', 6001, '/system/menus', 'system-menus', 'pages/menus', 'panel-left',
   'system:admin', 1, 0, 0, 0, 'INTERNAL', 40, 'ACTIVE'),
  (6006, 1, 0, 0, 'system.dicts', 'Dictionaries', 'MENU', 6001, '/system/dicts', 'system-dicts', 'pages/dicts', 'book-text',
   'system:admin', 1, 0, 0, 0, 'INTERNAL', 50, 'ACTIVE'),
  (6007, 1, 0, 0, 'system.clients', 'System Clients', 'MENU', 6001, '/system/clients', 'system-clients', 'pages/clients', 'bot',
   'system:admin', 1, 0, 0, 0, 'INTERNAL', 60, 'ACTIVE'),
  (6008, 1, 0, 0, 'system.audit', 'Audit Logs', 'MENU', 6001, '/system/audit', 'system-audit', 'pages/audit', 'scroll-text',
   'system:admin', 1, 0, 0, 0, 'INTERNAL', 70, 'ACTIVE'),
  (6009, 1, 0, 0, 'system.async', 'Async Tasks', 'MENU', 6001, '/system/async', 'system-async', 'pages/async', 'refresh-cw',
   'system:admin', 1, 0, 0, 0, 'INTERNAL', 80, 'ACTIVE');

INSERT INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (7001, 1, 0, 0, 2001, 6001, 'VISIBLE'),
  (7002, 1, 0, 0, 2001, 6002, 'VISIBLE'),
  (7003, 1, 0, 0, 2001, 6003, 'VISIBLE'),
  (7004, 1, 0, 0, 2001, 6004, 'VISIBLE'),
  (7005, 1, 0, 0, 2001, 6005, 'VISIBLE'),
  (7006, 1, 0, 0, 2001, 6006, 'VISIBLE'),
  (7007, 1, 0, 0, 2001, 6007, 'VISIBLE'),
  (7008, 1, 0, 0, 2001, 6008, 'VISIBLE'),
  (7009, 1, 0, 0, 2001, 6009, 'VISIBLE'),
  (7010, 1, 0, 0, 2002, 6001, 'VISIBLE'),
  (7011, 1, 0, 0, 2002, 6002, 'VISIBLE'),
  (7012, 1, 0, 0, 2002, 6003, 'VISIBLE'),
  (7013, 1, 0, 0, 2002, 6004, 'VISIBLE'),
  (7014, 1, 0, 0, 2002, 6005, 'VISIBLE'),
  (7015, 1, 0, 0, 2002, 6006, 'VISIBLE'),
  (7016, 1, 0, 0, 2002, 6007, 'VISIBLE'),
  (7017, 1, 0, 0, 2002, 6008, 'VISIBLE'),
  (7018, 1, 0, 0, 2002, 6009, 'VISIBLE');

INSERT INTO sys_dict_types (id, tenant_id, created_by, updated_by, dict_code, dict_name, status, remark) VALUES
  (8001, 1, 0, 0, 'task_status', 'Task Status', 'ACTIVE', 'Task lifecycle statuses'),
  (8002, 1, 0, 0, 'async_task_status', 'Async Task Status', 'ACTIVE', 'Async task statuses');

INSERT INTO sys_dict_items (id, tenant_id, created_by, updated_by, dict_type_id, item_code, item_label, item_value, sort_no, is_default, status) VALUES
  (8101, 1, 0, 0, 8001, 'DRAFT', 'Draft', 'DRAFT', 1, 1, 'ACTIVE'),
  (8102, 1, 0, 0, 8001, 'ACTIVE', 'Active', 'ACTIVE', 2, 0, 'ACTIVE'),
  (8103, 1, 0, 0, 8001, 'ARCHIVED', 'Archived', 'ARCHIVED', 3, 0, 'ACTIVE'),
  (8201, 1, 0, 0, 8002, 'PENDING', 'Pending', 'PENDING', 1, 1, 'ACTIVE'),
  (8202, 1, 0, 0, 8002, 'FAILED', 'Failed', 'FAILED', 2, 0, 'ACTIVE'),
  (8203, 1, 0, 0, 8002, 'DEAD_LETTER', 'Dead Letter', 'DEAD_LETTER', 3, 0, 'ACTIVE');

INSERT INTO system_clients (
  id, tenant_id, created_by, updated_by, client_code, client_name, client_secret_hash, client_type, allowed_scopes_json, ip_whitelist_json, status
) VALUES (
  9001, 1, 0, 0, 'system-agent', 'System Agent', '$2y$10$1RfoZFIzbXcHyq0LBGbloeddaFT.RswgBtOWxROPvGN4cdAL4ToTi',
  'AGENT', '["internal:health","internal:agent"]', NULL, 'ACTIVE'
);
