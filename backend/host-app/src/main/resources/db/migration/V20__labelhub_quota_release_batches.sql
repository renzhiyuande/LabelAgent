-- LabelHub V20: QUOTA 配额放量批次表
-- 生成日期: 2026-05-30
-- 用途: 记录 QUOTA 分发策略任务的多次放量台账（每次放量一条），Redis 库存为实时权威、本表为审计与重建依据

CREATE TABLE IF NOT EXISTS `task_quota_release_batches` (
  `id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_flag` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ext_json` JSON NULL,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `batch_no` VARCHAR(64) NOT NULL,
  `release_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `released_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `released_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  `remark` VARCHAR(512) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_quota_release_batches_no` (`tenant_id`, `task_id`, `batch_no`, `deleted_flag`),
  KEY `idx_quota_release_batches_task_time` (`tenant_id`, `task_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
