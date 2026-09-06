-- LabelHub V27: 文件资产 API 权限点

INSERT INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (4012, 1, 0, 0, 'system:file:upload', 'Upload Files', 'SYSTEM', '/api/v1/files/upload', 'ACTIVE'),
  (4013, 1, 0, 0, 'system:file:read', 'Read Files', 'SYSTEM', '/api/v1/files/**', 'ACTIVE'),
  (4014, 1, 0, 0, 'system:file:delete', 'Delete Files', 'SYSTEM', '/api/v1/files/*', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  module_code = VALUES(module_code),
  api_pattern = VALUES(api_pattern),
  status = VALUES(status),
  deleted_flag = 0;

INSERT INTO role_permissions (id, tenant_id, created_by, updated_by, role_id, permission_id, grant_source) VALUES
  (5014, 1, 0, 0, 2001, 4012, 'SYSTEM'),
  (5015, 1, 0, 0, 2001, 4013, 'SYSTEM'),
  (5016, 1, 0, 0, 2001, 4014, 'SYSTEM'),
  (5017, 1, 0, 0, 2002, 4012, 'SYSTEM'),
  (5018, 1, 0, 0, 2002, 4013, 'SYSTEM'),
  (5019, 1, 0, 0, 2002, 4014, 'SYSTEM'),
  (5020, 1, 0, 0, 2003, 4012, 'SYSTEM'),
  (5021, 1, 0, 0, 2003, 4013, 'SYSTEM'),
  (5022, 1, 0, 0, 2004, 4012, 'SYSTEM'),
  (5023, 1, 0, 0, 2004, 4013, 'SYSTEM')
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  permission_id = VALUES(permission_id),
  grant_source = VALUES(grant_source),
  deleted_flag = 0;
