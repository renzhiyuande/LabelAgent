-- AI 审核观测：扩展主记录、attempt 明细表、历史回填、菜单与权限

ALTER TABLE ai_review_records
    ADD COLUMN total_latency_ms INT UNSIGNED NULL AFTER finished_at,
    ADD COLUMN attempt_count SMALLINT UNSIGNED NULL AFTER total_latency_ms,
    ADD COLUMN prompt_tokens INT UNSIGNED NULL AFTER attempt_count,
    ADD COLUMN completion_tokens INT UNSIGNED NULL AFTER prompt_tokens,
    ADD COLUMN total_tokens INT UNSIGNED NULL AFTER completion_tokens,
    ADD COLUMN error_code VARCHAR(64) NULL AFTER total_tokens,
    ADD COLUMN traceability_status VARCHAR(32) NOT NULL DEFAULT 'LEGACY_BACKFILLED' AFTER error_code,
    ADD COLUMN history_gap_reason VARCHAR(512) NULL AFTER traceability_status;

CREATE TABLE IF NOT EXISTS ai_review_llm_attempts (
    id BIGINT UNSIGNED NOT NULL,
    tenant_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
    created_by BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_by BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_flag TINYINT UNSIGNED NOT NULL DEFAULT 0,
    ext_json JSON NULL,
    ai_review_id BIGINT UNSIGNED NOT NULL,
    submission_id BIGINT UNSIGNED NOT NULL,
    submission_version_id BIGINT UNSIGNED NOT NULL,
    task_id BIGINT UNSIGNED NOT NULL,
    attempt_no SMALLINT UNSIGNED NOT NULL,
    platform_key VARCHAR(64) NOT NULL,
    model_id VARCHAR(128) NOT NULL,
    provider_request_id VARCHAR(128) NULL,
    prompt_snapshot MEDIUMTEXT NULL,
    response_snapshot MEDIUMTEXT NULL,
    error_message VARCHAR(512) NULL,
    success_flag TINYINT UNSIGNED NOT NULL DEFAULT 0,
    latency_ms INT UNSIGNED NULL,
    prompt_tokens INT UNSIGNED NULL,
    completion_tokens INT UNSIGNED NULL,
    total_tokens INT UNSIGNED NULL,
    history_backfill_flag TINYINT UNSIGNED NOT NULL DEFAULT 0,
    traceability_status VARCHAR(32) NOT NULL DEFAULT 'FULL',
    history_gap_reason VARCHAR(512) NULL,
    started_at DATETIME(3) NULL,
    finished_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ai_review_llm_attempts (tenant_id, ai_review_id, attempt_no, deleted_flag),
    KEY idx_ai_review_llm_attempts_task_time (tenant_id, task_id, started_at),
    KEY idx_ai_review_llm_attempts_submission (tenant_id, submission_id, attempt_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 历史主记录回填
UPDATE ai_review_records r
SET
    attempt_count = COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(r.parsed_result_json, '$.attempts')) AS UNSIGNED),
        r.retry_no + 1,
        1
    ),
    total_latency_ms = CAST(JSON_UNQUOTE(JSON_EXTRACT(r.parsed_result_json, '$.llmLatencyMs')) AS UNSIGNED),
    error_code = CASE WHEN r.status = 'FAILED' THEN 'ENGINE_FAILED' ELSE NULL END,
    traceability_status = 'LEGACY_BACKFILLED',
    history_gap_reason = '历史记录仅保留最终快照；token 与逐次 attempt 明细不可追溯'
WHERE r.deleted_flag = 0;

-- 历史 attempt 单行回填（最终快照）
INSERT INTO ai_review_llm_attempts (
    id, tenant_id, created_by, updated_by, deleted_flag,
    ai_review_id, submission_id, submission_version_id, task_id,
    attempt_no, platform_key, model_id, provider_request_id,
    prompt_snapshot, response_snapshot, error_message,
    success_flag, latency_ms, prompt_tokens, completion_tokens, total_tokens,
    history_backfill_flag, traceability_status, history_gap_reason,
    started_at, finished_at, created_at, updated_at
)
SELECT
    (r.id * 1000) + 1,
    r.tenant_id,
    0,
    0,
    0,
    r.id,
    r.submission_id,
    r.submission_version_id,
    r.task_id,
    COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(r.parsed_result_json, '$.attempts')) AS UNSIGNED),
        r.retry_no + 1,
        1
    ),
    r.platform_key,
    r.model_id,
    r.provider_request_id,
    r.prompt_snapshot,
    r.raw_response_text,
    r.failure_reason,
    CASE WHEN r.status = 'SUCCESS' THEN 1 ELSE 0 END,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(r.parsed_result_json, '$.llmLatencyMs')) AS UNSIGNED),
    NULL,
    NULL,
    NULL,
    1,
    'LEGACY_BACKFILLED',
    '历史单次 attempt 由最终快照回填；token 不可追溯',
    r.started_at,
    r.finished_at,
    r.created_at,
    r.updated_at
FROM ai_review_records r
WHERE r.deleted_flag = 0
  AND NOT EXISTS (
      SELECT 1 FROM ai_review_llm_attempts a
      WHERE a.ai_review_id = r.id AND a.deleted_flag = 0
  );

-- 权限点
INSERT IGNORE INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
    (10020, 1, 0, 0, 'business:ai-review:observe:admin', 'Admin AI Review Observability', 'BUSINESS', '/api/v1/admin/ai-review-observability/**', 'ACTIVE'),
    (10021, 1, 0, 0, 'business:ai-review:observe:owner', 'Owner AI Review Observability', 'BUSINESS', '/api/v1/owner/ai-review-observability/**', 'ACTIVE');

INSERT IGNORE INTO role_permissions (id, tenant_id, created_by, updated_by, role_id, permission_id, grant_source) VALUES
    (10120, 1, 0, 0, 1001, 10020, 'SYSTEM'),
    (10121, 1, 0, 0, 2001, 10021, 'SYSTEM'),
    (10122, 1, 0, 0, 1001, 10021, 'SYSTEM');

-- Admin 菜单：平台 AI 审核大屏
INSERT IGNORE INTO sys_menus (
    id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
    permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
    (6010, 1, 0, 0, 'system.ai-review-observability', 'AI 审核大屏', 'MENU', 6001, '/system/ai-review-observability', 'system-ai-review-observability', 'pages/system/ai-review-observability', 'activity',
     'business:ai-review:observe:admin', 1, 0, 1, 0, 'INTERNAL', 95, 'ACTIVE');

INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
    (6020, 1, 0, 0, 1001, 6010, 'VISIBLE');

-- Owner 菜单：我的 AI 审核大屏
INSERT IGNORE INTO sys_menus (
    id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
    permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
    (20020, 1, 0, 0, 'owner.ai-review-observability', 'AI 审核大屏', 'MENU', 20001, '/owner/ai-review-observability', 'owner-ai-review-observability', 'pages/owner/ai-review-observability', 'activity',
     'business:ai-review:observe:owner', 1, 0, 1, 0, 'INTERNAL', 15, 'ACTIVE');

INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
    (20021, 1, 0, 0, 2001, 20020, 'VISIBLE'),
    (20022, 1, 0, 0, 1001, 20020, 'VISIBLE');
