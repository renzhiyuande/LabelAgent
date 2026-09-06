-- LabelHub V44: 审核结果列表菜单（lowcode resource/reviewerReviewRecords），共享 business:reviewer:workbench 权限

INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (40005, 1, 0, 0, 'reviewer.review-results', '审核结果', 'MENU', 40001, '/reviewer/review-results', 'reviewer-review-results', 'resource/reviewerReviewRecords', 'history',
   'business:reviewer:workbench', 1, 0, 1, 0, 'INTERNAL', 25, 'ACTIVE');

INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  (40105, 1, 0, 0, 2004, 40005, 'VISIBLE');

UPDATE sys_menus SET cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'reviewer.review-results' AND deleted_flag = 0;
