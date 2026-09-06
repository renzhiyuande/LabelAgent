-- Reviewer per-level permissions (optional granularity on top of workbench access)
-- IDs 10022-10026 avoid collision with V16 assignment permissions (10010-10012).

INSERT IGNORE INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (10022, 1, 0, 0, 'business:reviewer:level:L1', 'Reviewer Level L1', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE'),
  (10023, 1, 0, 0, 'business:reviewer:level:L2', 'Reviewer Level L2', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE'),
  (10024, 1, 0, 0, 'business:reviewer:level:L3', 'Reviewer Level L3', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE'),
  (10025, 1, 0, 0, 'business:reviewer:level:L4', 'Reviewer Level L4', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE'),
  (10026, 1, 0, 0, 'business:reviewer:level:L5', 'Reviewer Level L5', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE');

-- Platform REVIEWER (2004) keeps only business:reviewer:workbench (V7).
-- Users with workbench but no level:* grants retain access to all workflow levels.
-- Assign L1-L5 via admin role UI or seed roles for fine-grained reviewers.
