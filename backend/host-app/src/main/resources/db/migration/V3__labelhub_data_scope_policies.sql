CREATE TABLE `data_scope_policies` (
  `id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_flag` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ext_json` JSON NULL,
  `policy_code` VARCHAR(64) NOT NULL,
  `policy_name` VARCHAR(128) NOT NULL,
  `resource_type` VARCHAR(32) NOT NULL,
  `scope_type` VARCHAR(32) NOT NULL,
  `scope_value_json` JSON NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  `remark` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_data_scope_policies_code` (`tenant_id`, `policy_code`, `deleted_flag`),
  KEY `idx_data_scope_policies_resource` (`tenant_id`, `resource_type`, `status`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `role_data_scopes` (
  `id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_flag` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ext_json` JSON NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `policy_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_data_scopes` (`tenant_id`, `role_id`, `policy_id`, `deleted_flag`),
  KEY `idx_role_data_scopes_role` (`tenant_id`, `role_id`, `id`),
  KEY `idx_role_data_scopes_policy` (`tenant_id`, `policy_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (4010, 1, 0, 0, 'system:data-scope:read', 'Read Data Scope Policies', 'SYSTEM', '/api/v1/admin/data-scopes/**', 'ACTIVE'),
  (4011, 1, 0, 0, 'system:data-scope:write', 'Manage Data Scope Policies', 'SYSTEM', '/api/v1/admin/data-scopes/**', 'ACTIVE');

INSERT INTO role_permissions (id, tenant_id, created_by, updated_by, role_id, permission_id, grant_source) VALUES
  (5010, 1, 0, 0, 2001, 4010, 'SYSTEM'),
  (5011, 1, 0, 0, 2001, 4011, 'SYSTEM'),
  (5012, 1, 0, 0, 2002, 4010, 'SYSTEM'),
  (5013, 1, 0, 0, 2002, 4011, 'SYSTEM');

INSERT INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (6010, 1, 0, 0, 'system.data-scopes', 'Data Scopes', 'MENU', 6001, '/system/data-scopes', 'system-data-scopes', 'pages/data-scopes', 'database-zap',
   'system:data-scope:read', 1, 0, 0, 0, 'INTERNAL', 90, 'ACTIVE');

INSERT INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (7019, 1, 0, 0, 2001, 6010, 'VISIBLE'),
  (7020, 1, 0, 0, 2002, 6010, 'VISIBLE');

INSERT INTO data_scope_policies (
  id, tenant_id, created_by, updated_by, policy_code, policy_name, resource_type, scope_type, scope_value_json, status, remark
) VALUES
  (9101, 1, 0, 0, 'task.all', 'All Tasks', 'TASK', 'ALL', NULL, 'ACTIVE', 'Seeded admin task access'),
  (9102, 1, 0, 0, 'assignment.all', 'All Assignments', 'ASSIGNMENT', 'ALL', NULL, 'ACTIVE', 'Seeded admin assignment access'),
  (9103, 1, 0, 0, 'review.all', 'All Reviews', 'REVIEW', 'ALL', NULL, 'ACTIVE', 'Seeded admin review access'),
  (9104, 1, 0, 0, 'project.placeholder', 'Project Placeholder', 'PROJECT', 'CUSTOM', JSON_OBJECT('enabled', false), 'ACTIVE', 'Model-only project scope');

INSERT INTO role_data_scopes (id, tenant_id, created_by, updated_by, role_id, policy_id) VALUES
  (9201, 1, 0, 0, 2001, 9101),
  (9202, 1, 0, 0, 2001, 9102),
  (9203, 1, 0, 0, 2001, 9103),
  (9204, 1, 0, 0, 2001, 9104),
  (9205, 1, 0, 0, 2002, 9101),
  (9206, 1, 0, 0, 2002, 9102),
  (9207, 1, 0, 0, 2002, 9103),
  (9208, 1, 0, 0, 2002, 9104);
