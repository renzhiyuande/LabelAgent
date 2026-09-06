-- LabelHub V13: 自动给ADMIN角色绑定V12迁移脚本新插入的6个模板权限点
-- ADMIN role_id = 2002, template permission_ids = 4101~4106

INSERT INTO role_permissions (id, tenant_id, created_by, updated_by, role_id, permission_id, grant_source) VALUES
  (5101, 1, 0, 0, 2002, 4101, 'SYSTEM'),
  (5102, 1, 0, 0, 2002, 4102, 'SYSTEM'),
  (5103, 1, 0, 0, 2002, 4103, 'SYSTEM'),
  (5104, 1, 0, 0, 2002, 4104, 'SYSTEM'),
  (5105, 1, 0, 0, 2002, 4105, 'SYSTEM'),
  (5106, 1, 0, 0, 2002, 4106, 'SYSTEM')
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  permission_id = VALUES(permission_id),
  grant_source = VALUES(grant_source),
  deleted_flag = 0;
