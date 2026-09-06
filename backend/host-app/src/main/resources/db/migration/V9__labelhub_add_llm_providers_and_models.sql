-- LabelHub 新增 LLM 提供商与模型管理表
-- MySQL 8.0+ / InnoDB / utf8mb4_0900_ai_ci
-- 主键由应用侧发号（雪花/Leaf），非 AUTO_INCREMENT

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `llm_providers` (
  `id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_flag` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ext_json` JSON NULL,
  `provider_code` VARCHAR(64) NOT NULL,
  `provider_name` VARCHAR(128) NOT NULL,
  `base_url` VARCHAR(255) NULL,
  `api_key_ciphertext` VARCHAR(1024) NULL,
  `api_version` VARCHAR(64) NULL,
  `config_json` JSON NULL,
  `is_system_provider` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `is_default` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  `last_health_status` VARCHAR(16) NULL,
  `last_health_check_at` DATETIME(3) NULL,
  `last_error_message` VARCHAR(512) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_llm_providers_tenant_code` (`tenant_id`, `provider_code`, `deleted_flag`),
  KEY `idx_llm_providers_status` (`tenant_id`, `status`, `is_default`),
  KEY `idx_llm_providers_health` (`tenant_id`, `last_health_status`, `last_health_check_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `llm_models` (
  `id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_flag` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ext_json` JSON NULL,
  `provider_id` BIGINT UNSIGNED NOT NULL,
  `model_code` VARCHAR(128) NOT NULL,
  `model_name` VARCHAR(128) NOT NULL,
  `model_type` VARCHAR(32) NOT NULL,
  `model_version` VARCHAR(32) NULL,
  `context_window` INT UNSIGNED NULL,
  `max_output_tokens` INT UNSIGNED NULL,
  `cost_per_1k_input_tokens` DECIMAL(12,6) NULL,
  `cost_per_1k_output_tokens` DECIMAL(12,6) NULL,
  `supported_features_json` JSON NULL,
  `model_config_json` JSON NULL,
  `is_default_for_provider` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_llm_models_provider_code` (`tenant_id`, `provider_id`, `model_code`, `deleted_flag`),
  KEY `idx_llm_models_provider_status` (`tenant_id`, `provider_id`, `status`),
  KEY `idx_llm_models_type` (`tenant_id`, `model_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `llm_models` ADD CONSTRAINT `fk_llm_models_provider` FOREIGN KEY (`provider_id`) REFERENCES `llm_providers` (`id`);

SET FOREIGN_KEY_CHECKS = 1;
