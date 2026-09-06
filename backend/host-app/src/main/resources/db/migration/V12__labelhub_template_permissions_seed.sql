-- LabelHub 新增模板管理模块权限点种子
-- MySQL 8.0+ / InnoDB / utf8mb4_0900_ai_ci

INSERT INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (4101, 1, 0, 0, 'template:read', 'View Templates', 'TEMPLATE', '/api/v1/templates/**', 'ACTIVE'),
  (4102, 1, 0, 0, 'template:create', 'Create Templates', 'TEMPLATE', '/api/v1/templates', 'ACTIVE'),
  (4103, 1, 0, 0, 'template:update', 'Edit Templates', 'TEMPLATE', '/api/v1/templates/*', 'ACTIVE'),
  (4104, 1, 0, 0, 'template:delete', 'Delete Templates', 'TEMPLATE', '/api/v1/templates/*', 'ACTIVE'),
  (4105, 1, 0, 0, 'template:market:publish', 'Publish to Template Market', 'TEMPLATE', '/api/v1/template-market/publish', 'ACTIVE'),
  (4106, 1, 0, 0, 'template:market:audit', 'Audit Template Market Entries', 'TEMPLATE', '/api/v1/template-market/audit/**', 'ACTIVE');
