-- OWNER is a task-domain role; ADMIN is the system super-admin.
-- This migration corrects seed data for databases that already ran V2/V3.

UPDATE roles
SET remark = 'Task owner'
WHERE tenant_id = 1 AND role_code = 'OWNER' AND deleted_flag = 0;

UPDATE user_roles
SET deleted_flag = 1
WHERE tenant_id = 1 AND user_id = 1001 AND role_id = 2001 AND deleted_flag = 0;

UPDATE role_permissions
SET deleted_flag = 1
WHERE tenant_id = 1 AND role_id = 2001 AND deleted_flag = 0;

UPDATE role_menus
SET deleted_flag = 1
WHERE tenant_id = 1 AND role_id = 2001 AND deleted_flag = 0;

UPDATE role_data_scopes
SET deleted_flag = 1
WHERE tenant_id = 1 AND role_id = 2001 AND deleted_flag = 0;

INSERT INTO data_scope_policies (
  id, tenant_id, created_by, updated_by, policy_code, policy_name, resource_type, scope_type, scope_value_json, status, remark
) VALUES
  (9105, 1, 0, 0, 'task.owner', 'Owned Tasks', 'TASK', 'TASK_OWNER', NULL, 'ACTIVE', 'Seeded task owner access'),
  (9106, 1, 0, 0, 'assignment.owner', 'Owned Task Assignments', 'ASSIGNMENT', 'TASK_OWNER', NULL, 'ACTIVE', 'Seeded task owner assignment access'),
  (9107, 1, 0, 0, 'review.owner', 'Owned Task Reviews', 'REVIEW', 'TASK_OWNER', NULL, 'ACTIVE', 'Seeded task owner review access')
ON DUPLICATE KEY UPDATE
  policy_name = VALUES(policy_name),
  resource_type = VALUES(resource_type),
  scope_type = VALUES(scope_type),
  status = VALUES(status),
  remark = VALUES(remark);

INSERT INTO role_data_scopes (id, tenant_id, created_by, updated_by, role_id, policy_id, deleted_flag) VALUES
  (9201, 1, 0, 0, 2001, 9105, 0),
  (9202, 1, 0, 0, 2001, 9106, 0),
  (9203, 1, 0, 0, 2001, 9107, 0)
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  policy_id = VALUES(policy_id),
  deleted_flag = 0;
