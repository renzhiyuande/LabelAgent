-- LabelHub V29: 素材库（FILE）数据权限策略种子，通过 role_data_scopes 绑定角色

SET NAMES utf8mb4;

INSERT IGNORE INTO data_scope_policies (
  id, tenant_id, created_by, updated_by, policy_code, policy_name, resource_type, scope_type, scope_value_json, status, remark
) VALUES
  (9110, 1, 0, 0, 'file.all', '全部素材', 'FILE', 'ALL', NULL, 'ACTIVE', '管理员可见全部素材'),
  (9111, 1, 0, 0, 'file.public_or_own', '本人上传或公开素材', 'FILE', 'PUBLIC_OR_OWN', NULL, 'ACTIVE', '可见本人上传及公开素材');

INSERT IGNORE INTO role_data_scopes (id, tenant_id, created_by, updated_by, role_id, policy_id) VALUES
  (9210, 1, 0, 0, 2002, 9110),
  (9211, 1, 0, 0, 2001, 9111),
  (9212, 1, 0, 0, 2003, 9111),
  (9213, 1, 0, 0, 2004, 9111);
