-- Fix reviewer level permissions when V37 used ids 10010-10012 (already taken by V16 assignment perms).

INSERT INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (10022, 1, 0, 0, 'business:reviewer:level:L1', 'Reviewer Level L1', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE'),
  (10023, 1, 0, 0, 'business:reviewer:level:L2', 'Reviewer Level L2', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE'),
  (10024, 1, 0, 0, 'business:reviewer:level:L3', 'Reviewer Level L3', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE'),
  (10025, 1, 0, 0, 'business:reviewer:level:L4', 'Reviewer Level L4', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE'),
  (10026, 1, 0, 0, 'business:reviewer:level:L5', 'Reviewer Level L5', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  permission_code = VALUES(permission_code),
  permission_name = VALUES(permission_name),
  module_code = VALUES(module_code),
  api_pattern = VALUES(api_pattern),
  status = VALUES(status),
  deleted_flag = 0;
