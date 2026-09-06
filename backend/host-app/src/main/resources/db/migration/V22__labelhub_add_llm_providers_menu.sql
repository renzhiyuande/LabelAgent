-- LabelHub V22: 新增 LLM 提供商菜单项（系统管理下）
-- 注意：6010/7019/7020 已在 V3（数据权限）占用，此处使用 6012/7021

SET NAMES utf8mb4;

INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES (
  6012, 1, 0, 0, 'system.llm-providers', 'LLM 提供商', 'MENU', 6001, '/system/llm-providers', 'system-llm-providers', 'pages/llm-providers', 'brain-circuit',
  'system:admin', 1, 0, 1, 0, 'INTERNAL', 85, 'ACTIVE'
);

INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (7021, 1, 0, 0, 2002, 6012, 'VISIBLE');
