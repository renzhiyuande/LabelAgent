CREATE TABLE ai_review_prompt_health_metrics (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT NOT NULL DEFAULT 0,
    deleted_flag TINYINT NOT NULL DEFAULT 0,
    template_version_id BIGINT NOT NULL,
    task_id BIGINT NULL,
    metric_date DATE NOT NULL,
    window_days INT NOT NULL DEFAULT 30,
    sample_count INT NOT NULL DEFAULT 0,
    metrics_json JSON NOT NULL,
    health_status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ai_review_prompt_health_metrics_scope (
        tenant_id, template_version_id, task_id, metric_date, window_days, deleted_flag
    ),
    KEY idx_ai_review_prompt_health_metrics_version_date (
        tenant_id, template_version_id, metric_date DESC
    )
);

CREATE TABLE ai_review_misalignment_cases (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT NOT NULL DEFAULT 0,
    deleted_flag TINYINT NOT NULL DEFAULT 0,
    template_version_id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    submission_id BIGINT NOT NULL,
    submission_version_id BIGINT NOT NULL,
    ai_review_id BIGINT NOT NULL,
    ai_verdict VARCHAR(16) NOT NULL,
    human_label VARCHAR(16) NOT NULL,
    misalignment_type VARCHAR(32) NOT NULL,
    appeal_id BIGINT NULL,
    item_payload_json JSON NULL,
    submit_data_json JSON NULL,
    ai_summary_text TEXT NULL,
    ai_dimension_scores_json JSON NULL,
    human_comment_text VARCHAR(1000) NULL,
    split_tag VARCHAR(16) NOT NULL DEFAULT 'TRAIN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_misalignment_template_split (tenant_id, template_version_id, split_tag, created_at DESC),
    KEY idx_misalignment_submission_version (tenant_id, submission_version_id, ai_review_id, deleted_flag)
);
