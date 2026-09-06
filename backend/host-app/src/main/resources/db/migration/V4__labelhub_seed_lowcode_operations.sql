INSERT INTO audit_logs (
  id, tenant_id, created_by, updated_by, entity_type, entity_id, action_code, operator_type, operator_id,
  operator_name, request_id, trace_id, source_ip, before_json, after_json, diff_json, remark, idempotency_key, occurred_at
) VALUES (
  9301, 1, 0, 0, 'USER', 1001, 'user.create', 'USER', 1001,
  'Platform Admin', 'seed-request-1', 'seed-trace-1', '127.0.0.1', NULL, JSON_OBJECT('id', 1001), NULL,
  'seed audit log', 'seed-user-create-1001', '2026-05-20 08:30:00.000'
);

INSERT INTO async_tasks (
  id, tenant_id, created_by, updated_by, task_type, biz_type, biz_id, biz_key, priority, status,
  payload_json, retry_count, max_retry_count, manual_retry_count, next_run_at, worker_id, locked_at,
  started_at, finished_at, canceled_at, dead_lettered_at, last_error_code, last_error_message
) VALUES
  (
    9401, 1, 0, 0, 'EXPORT', 'TASK', 1001, 'task-export-1001', 5, 'PENDING',
    JSON_OBJECT('format', 'csv', 'resource', 'users'), 0, 3, 0, '2026-05-21 10:00:00.000', NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL
  ),
  (
    9402, 1, 0, 0, 'WEBHOOK', 'TASK', 1002, 'task-webhook-1002', 8, 'FAILED',
    JSON_OBJECT('target', 'https://example.com/hook', 'resource', 'roles'), 1, 3, 0, '2026-05-21 11:00:00.000', NULL, NULL,
    '2026-05-21 10:58:00.000', NULL, NULL, NULL, 'HTTP_500', 'seed failure'
  );
