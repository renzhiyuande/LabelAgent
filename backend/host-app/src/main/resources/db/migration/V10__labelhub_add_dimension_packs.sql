-- LabelHub 新增审核维度包管理表
-- MySQL 8.0+ / InnoDB / utf8mb4_0900_ai_ci
-- 主键由应用侧发号（雪花/Leaf），非 AUTO_INCREMENT

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `template_review_dimension_packs` (
  `id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_flag` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ext_json` JSON NULL,
  `pack_code` VARCHAR(64) NOT NULL,
  `pack_name` VARCHAR(128) NOT NULL,
  `pack_desc` VARCHAR(512) NULL,
  `scene_code` VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
  `is_system_pack` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `dimension_specs_json` JSON NOT NULL,
  `sort_no` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trd_packs_tenant_code` (`tenant_id`, `pack_code`, `deleted_flag`),
  KEY `idx_trd_packs_scene_status` (`tenant_id`, `scene_code`, `status`, `sort_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
