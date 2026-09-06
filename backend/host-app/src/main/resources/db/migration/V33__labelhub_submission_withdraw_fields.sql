ALTER TABLE submissions
    ADD COLUMN withdraw_count INT NOT NULL DEFAULT 0 AFTER return_count,
    ADD COLUMN appeal_count INT NOT NULL DEFAULT 0 AFTER withdraw_count,
    ADD COLUMN last_withdrawn_at TIMESTAMP NULL DEFAULT NULL AFTER last_submitted_at,
    ADD COLUMN last_appealed_at TIMESTAMP NULL DEFAULT NULL AFTER last_withdrawn_at;

CREATE INDEX idx_submissions_status_labeler_deleted
    ON submissions (tenant_id, labeler_id, current_status, deleted_flag);
