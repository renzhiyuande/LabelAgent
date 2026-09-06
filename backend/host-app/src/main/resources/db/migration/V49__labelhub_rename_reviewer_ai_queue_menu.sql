-- 审核工作台：「AI待审队列」更名为「AI审核队列」
UPDATE sys_menus
SET menu_name = 'AI审核队列',
    updated_by = 0
WHERE tenant_id = 1
  AND menu_code = 'reviewer.ai-queue'
  AND deleted_flag = 0;
