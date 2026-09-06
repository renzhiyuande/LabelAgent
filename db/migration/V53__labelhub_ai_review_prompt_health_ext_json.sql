-- AbstractEntity 含 ext_json；V50/V51 新建表已含该列，此处仅补齐历史库或部分失败重试场景。

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'ai_review_prompt_health_metrics'
     AND column_name = 'ext_json') = 0,
  'ALTER TABLE ai_review_prompt_health_metrics ADD COLUMN ext_json JSON NULL AFTER deleted_flag',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'ai_review_misalignment_cases'
     AND column_name = 'ext_json') = 0,
  'ALTER TABLE ai_review_misalignment_cases ADD COLUMN ext_json JSON NULL AFTER deleted_flag',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'ai_review_prompt_suggestions'
     AND column_name = 'ext_json') = 0,
  'ALTER TABLE ai_review_prompt_suggestions ADD COLUMN ext_json JSON NULL AFTER deleted_flag',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
