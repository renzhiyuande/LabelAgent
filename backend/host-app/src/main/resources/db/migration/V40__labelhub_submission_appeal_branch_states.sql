-- 申诉分支显式状态：替换 APPEALING / APPEAL_APPROVED / APPEAL_REJECTED
-- 最长状态名 AI_REVIEWING_APPEAL_HUMAN(27)、APPEAL_APPROVED_SKIP_HUMAN(28)，原列 VARCHAR(24) 不足

ALTER TABLE submissions
  MODIFY COLUMN current_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT';

ALTER TABLE submission_status_histories
  MODIFY COLUMN from_status VARCHAR(32) NULL,
  MODIFY COLUMN to_status VARCHAR(32) NOT NULL;

ALTER TABLE review_records
  MODIFY COLUMN from_status VARCHAR(32) NOT NULL,
  MODIFY COLUMN to_status VARCHAR(32) NOT NULL;

ALTER TABLE ai_review_records
  MODIFY COLUMN fallback_target_status VARCHAR(32) NULL;

UPDATE submissions
SET current_status = 'APPEALING_AI'
WHERE current_status = 'APPEALING'
  AND last_action_code = 'SUBMIT_APPEAL'
  AND EXISTS (
    SELECT 1
    FROM submission_appeals a
    WHERE a.submission_id = submissions.id
      AND a.deleted_flag = 0
      AND a.status = 'PENDING'
      AND a.ext_json LIKE '%AI_REJECTED%'
  );

UPDATE submissions
SET current_status = 'APPEALING_HUMAN'
WHERE current_status = 'APPEALING';

UPDATE submissions
SET current_status = 'APPEAL_APPROVED_SKIP_AI'
WHERE current_status = 'APPEAL_APPROVED'
  AND EXISTS (
    SELECT 1
    FROM submission_appeals a
    WHERE a.submission_id = submissions.id
      AND a.deleted_flag = 0
      AND a.status = 'APPROVED'
      AND a.ext_json LIKE '%AI_REJECTED%'
  );

UPDATE submissions
SET current_status = 'APPEAL_APPROVED_SKIP_HUMAN'
WHERE current_status = 'APPEAL_APPROVED';

UPDATE submissions
SET current_status = 'AI_REJECTED'
WHERE current_status = 'APPEAL_REJECTED'
  AND EXISTS (
    SELECT 1
    FROM submission_appeals a
    WHERE a.submission_id = submissions.id
      AND a.deleted_flag = 0
      AND a.status = 'REJECTED'
      AND a.ext_json LIKE '%AI_REJECTED%'
  );

UPDATE submissions
SET current_status = 'REJECTED'
WHERE current_status = 'APPEAL_REJECTED';

INSERT INTO sys_dict_items (id, tenant_id, created_by, updated_by, dict_type_id, item_code, item_label, item_value, sort_no, is_default, status, ext_json) VALUES
  (8451, 1, 0, 0, 8033, 'AI_REJECTED', 'AI已拒绝', 'AI_REJECTED', 7, 0, 'ACTIVE', '{"tone":"destructive","className":"lh-tag destructive"}'),
  (8452, 1, 0, 0, 8033, 'HUMAN_REVIEWING', '人工审核中', 'HUMAN_REVIEWING', 8, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),
  (8453, 1, 0, 0, 8033, 'AI_PASSED', 'AI已通过', 'AI_PASSED', 9, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8454, 1, 0, 0, 8033, 'APPEALING_AI', 'AI驳回申诉中', 'APPEALING_AI', 10, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),
  (8455, 1, 0, 0, 8033, 'APPEALING_HUMAN', '终审驳回申诉中', 'APPEALING_HUMAN', 11, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),
  (8456, 1, 0, 0, 8033, 'APPEAL_APPROVED_SKIP_AI', '申诉通过待改稿(免AI)', 'APPEAL_APPROVED_SKIP_AI', 12, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8457, 1, 0, 0, 8033, 'APPEAL_APPROVED_SKIP_HUMAN', '申诉通过待改稿(免终审)', 'APPEAL_APPROVED_SKIP_HUMAN', 13, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8458, 1, 0, 0, 8033, 'SUBMITTED_APPEAL_HUMAN', '申诉后已提交', 'SUBMITTED_APPEAL_HUMAN', 14, 0, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8459, 1, 0, 0, 8033, 'AI_REVIEWING_APPEAL_HUMAN', 'AI审核中(免终审)', 'AI_REVIEWING_APPEAL_HUMAN', 15, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}')
ON DUPLICATE KEY UPDATE
  item_label = VALUES(item_label),
  item_value = VALUES(item_value),
  sort_no = VALUES(sort_no),
  status = VALUES(status),
  ext_json = VALUES(ext_json),
  updated_at = NOW();
