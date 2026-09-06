CREATE INDEX idx_reward_settlement_batches_task_status_deleted
    ON reward_settlement_batches (tenant_id, task_id, status, deleted_flag);

CREATE INDEX idx_reward_settlement_details_batch_deleted_user
    ON reward_settlement_details (tenant_id, batch_id, deleted_flag, user_id);
