-- Reviewer audit pool: only submissions on tasks where the user is an active REVIEWER task member.

INSERT IGNORE INTO data_scope_policies (
  id, tenant_id, created_by, updated_by, policy_code, policy_name, resource_type, scope_type, scope_value_json, status, remark
) VALUES
  (9108, 1, 0, 0, 'review.task_member', 'Task Member Reviews', 'REVIEW', 'TASK_MEMBER', NULL, 'ACTIVE',
   'Reviewer workbench limited to tasks with ACTIVE task_members.member_role = REVIEWER');

INSERT IGNORE INTO role_data_scopes (id, tenant_id, created_by, updated_by, role_id, policy_id) VALUES
  (9214, 1, 0, 0, 2004, 9108);
