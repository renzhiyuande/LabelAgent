-- AbstractEntity 含 ext_json，与 submission_appeals 等表对齐

ALTER TABLE appeal_batch_operations
  ADD COLUMN ext_json JSON NULL AFTER failure_summary_json;
