-- Scheduled Tasks 定时任务表
CREATE TABLE IF NOT EXISTS `scheduled_tasks` (
  `id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_by` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_flag` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ext_json` JSON NULL,
  `task_name` VARCHAR(128) NOT NULL,
  `task_type` VARCHAR(32) NOT NULL,
  `cron_expr` VARCHAR(64) NOT NULL,
  `payload_json` JSON NOT NULL DEFAULT (CAST('{}' AS JSON)),
  `biz_type` VARCHAR(32) NOT NULL DEFAULT '',
  `biz_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `priority` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `max_retry_count` SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  `enabled` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `last_triggered_at` DATETIME(3) NULL,
  `next_trigger_at` DATETIME(3) NULL,
  `total_trigger_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `description` VARCHAR(512) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scheduled_tasks_name` (`tenant_id`, `task_name`, `deleted_flag`),
  KEY `idx_scheduled_tasks_enabled_next` (`tenant_id`, `enabled`, `next_trigger_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 菜单：定时任务
INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (6011, 1, 0, 0, 'system.scheduled', '定时任务', 'MENU', 6001, '/system/scheduled', 'system-scheduled', 'pages/scheduled', 'clock',
   'system:admin', 1, 0, 0, 0, 'INTERNAL', 83, 'ACTIVE');

-- 绑定菜单到 admin 角色 (role_id=2002)
INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (6011, 1, 0, 0, 2002, 6011, 'ALL');
