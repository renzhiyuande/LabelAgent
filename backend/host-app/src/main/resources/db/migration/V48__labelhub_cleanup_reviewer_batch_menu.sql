-- reviewer.batch 独立菜单已无必要：
-- 批量审核能力保留在人工审核池页内，不再暴露单独导航入口。
UPDATE sys_menus
SET visible_flag = 0,
    disabled_flag = 1,
    updated_by = 0
WHERE tenant_id = 1
  AND menu_code = 'reviewer.batch'
  AND deleted_flag = 0;
