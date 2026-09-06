-- 内置 AI 预审健康度日批定时任务（与 BuiltinScheduledTaskInitializer 保持一致）
INSERT INTO `scheduled_tasks` (
  `id`,
  `tenant_id`,
  `created_by`,
  `updated_by`,
  `task_name`,
  `task_type`,
  `cron_expr`,
  `payload_json`,
  `biz_type`,
  `biz_id`,
  `priority`,
  `max_retry_count`,
  `enabled`,
  `next_trigger_at`,
  `total_trigger_count`,
  `description`
)
SELECT
  52001,
  1,
  0,
  0,
  'ai-review-prompt-health-daily',
  'AI_REVIEW_PROMPT_HEALTH',
  '0 15 2 * * *',
  CAST('{"metricDate":"yesterday"}' AS JSON),
  'AI_REVIEW_PROMPT_HEALTH',
  0,
  5,
  3,
  1,
  CURRENT_TIMESTAMP(3),
  0,
  '每日凌晨自动聚合 AI 预审健康指标并抽取误判样本'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM `scheduled_tasks`
  WHERE `task_name` = 'ai-review-prompt-health-daily'
    AND `deleted_flag` = 0
);
