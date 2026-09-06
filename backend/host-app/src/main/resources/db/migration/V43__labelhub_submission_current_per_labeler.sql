-- LabelHub V43: 同一 assignment 支持多轮 submission（换标注员时归档旧记录、新建当前记录）

ALTER TABLE submissions
  ADD COLUMN is_current TINYINT UNSIGNED NULL DEFAULT 1
    COMMENT '1=assignment 当前有效 submission；NULL=已归档' AFTER version_no,
  ADD COLUMN superseded_at DATETIME(3) NULL AFTER is_current,
  ADD COLUMN superseded_reason VARCHAR(64) NULL AFTER superseded_at;

UPDATE submissions SET is_current = 1 WHERE is_current IS NULL;

ALTER TABLE submissions DROP INDEX uk_submissions_assignment;

ALTER TABLE submissions
  ADD UNIQUE KEY uk_submissions_assignment_current (tenant_id, assignment_id, is_current, deleted_flag);
