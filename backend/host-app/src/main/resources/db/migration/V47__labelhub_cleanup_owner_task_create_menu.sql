-- owner.task-create 已被任务列表页内的 low-code create drawer 吸收；
-- 保留独立菜单会形成重复入口，并且对应 pages/owner/task-create 没有独立页面语义。
UPDATE sys_menus
SET visible_flag = 0,
    disabled_flag = 1,
    updated_by = 0
WHERE tenant_id = 1
  AND menu_code = 'owner.task-create'
  AND deleted_flag = 0;
