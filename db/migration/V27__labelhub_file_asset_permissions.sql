-- LabelHub V27: 文件资产 API 权限点

INSERT IGNORE INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (10010, 1, 0, 0, 'system:file:upload', 'Upload Files', 'SYSTEM', '/api/v1/files/upload', 'ACTIVE'),
  (10011, 1, 0, 0, 'system:file:read', 'Read Files', 'SYSTEM', '/api/v1/files/**', 'ACTIVE'),
  (10012, 1, 0, 0, 'system:file:delete', 'Delete Files', 'SYSTEM', '/api/v1/files/*', 'ACTIVE');

INSERT IGNORE INTO role_permissions (id, tenant_id, created_by, updated_by, role_id, permission_id, grant_source) VALUES
  (10110, 1, 0, 0, 2001, 10010, 'SYSTEM'),
  (10111, 1, 0, 0, 2001, 10011, 'SYSTEM'),
  (10112, 1, 0, 0, 2001, 10012, 'SYSTEM'),
  (10113, 1, 0, 0, 2002, 10010, 'SYSTEM'),
  (10114, 1, 0, 0, 2002, 10011, 'SYSTEM'),
  (10115, 1, 0, 0, 2002, 10012, 'SYSTEM'),
  (10116, 1, 0, 0, 2003, 10010, 'SYSTEM'),
  (10117, 1, 0, 0, 2003, 10011, 'SYSTEM'),
  (10118, 1, 0, 0, 2004, 10010, 'SYSTEM'),
  (10119, 1, 0, 0, 2004, 10011, 'SYSTEM');
