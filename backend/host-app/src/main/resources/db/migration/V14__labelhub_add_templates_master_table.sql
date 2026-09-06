-- LabelHub 新增templates主表（模板根级主表，抽离通用字段降冗余）
-- MySQL 8.0+ / InnoDB / utf8mb4_0900_ai_ci
-- 主键由应用侧发号（雪花/Leaf），非 AUTO_INCREMENT

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 新建 templates 主表：1个模板 → N个版本，父子关系1:N
CREATE TABLE `templates` (
  `id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_flag` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ext_json` JSON NULL,
  `task_id` BIGINT UNSIGNED NULL,
  `source_market_id` BIGINT UNSIGNED NULL,
  `template_code` VARCHAR(64) NOT NULL,
  `template_name` VARCHAR(128) NOT NULL,
  `scene_code` VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
  `description_text` VARCHAR(2048) NULL,
  `current_template_version_id` BIGINT UNSIGNED NULL,
  `latest_version_no` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_templates_tenant_code` (`tenant_id`, `template_code`, `deleted_flag`),
  UNIQUE KEY `uk_templates_tenant_source_market` (`tenant_id`, `source_market_id`, `deleted_flag`),
  KEY `idx_templates_task` (`tenant_id`, `task_id`, `deleted_flag`),
  KEY `idx_templates_scene` (`tenant_id`, `scene_code`, `status`),
  KEY `idx_templates_current_version` (`tenant_id`, `current_template_version_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 给 template_versions 表新增 template_id 外键字段，建立父子关联
ALTER TABLE `template_versions`
  ADD COLUMN `template_id` BIGINT UNSIGNED NULL AFTER `id`,
  MODIFY COLUMN `task_id` BIGINT UNSIGNED NULL,
  ADD KEY `idx_template_versions_template` (`tenant_id`, `template_id`, `version_no`);

ALTER TABLE `template_versions`
  DROP INDEX `uk_template_versions_no`;

ALTER TABLE `template_versions`
  ADD UNIQUE KEY `uk_template_versions_template_no` (`tenant_id`, `template_id`, `version_no`, `deleted_flag`);

ALTER TABLE `template_versions`
  ADD UNIQUE KEY `uk_template_versions_task_no` (`tenant_id`, `task_id`, `version_no`, `deleted_flag`);

SET FOREIGN_KEY_CHECKS = 1;
