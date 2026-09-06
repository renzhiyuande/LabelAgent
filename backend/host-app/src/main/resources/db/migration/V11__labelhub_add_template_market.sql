-- LabelHub 新增模板市场表
-- MySQL 8.0+ / InnoDB / utf8mb4_0900_ai_ci
-- 主键由应用侧发号（雪花/Leaf），非 AUTO_INCREMENT

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `template_market` (
  `id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_flag` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ext_json` JSON NULL,
  `template_code` VARCHAR(64) NOT NULL,
  `template_name` VARCHAR(128) NOT NULL,
  `template_description` TEXT NULL,
  `category_code` VARCHAR(64) NULL,
  `scene_code` VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
  `cover_image_file_id` BIGINT UNSIGNED NULL,
  `author_id` BIGINT UNSIGNED NOT NULL,
  `source_tenant_id` BIGINT UNSIGNED NOT NULL,
  `source_task_id` BIGINT UNSIGNED NULL,
  `template_version_id` BIGINT UNSIGNED NULL,
  `schema_json` JSON NOT NULL,
  `review_prompt_template` MEDIUMTEXT NULL,
  `review_output_schema_json` JSON NULL,
  `review_workflow_json` JSON NULL,
  `acceptance_rule_json` JSON NULL,
  `llm_assist_config_json` JSON NULL,
  `tags_json` JSON NULL,
  `download_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `favorite_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `rating_avg` DECIMAL(3,2) NULL,
  `rating_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_public` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `is_featured` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `audit_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  `published_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_market_tenant_code` (`tenant_id`, `template_code`, `deleted_flag`),
  UNIQUE KEY `uk_template_market_version` (`tenant_id`, `template_version_id`, `deleted_flag`),
  KEY `idx_tm_scene_status` (`tenant_id`, `scene_code`, `status`, `audit_status`),
  KEY `idx_tm_author_time` (`tenant_id`, `author_id`, `created_at`),
  KEY `idx_tm_featured_download` (`tenant_id`, `is_featured`, `download_count`),
  KEY `idx_tm_public` (`tenant_id`, `is_public`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
