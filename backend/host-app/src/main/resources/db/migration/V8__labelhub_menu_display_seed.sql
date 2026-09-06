-- 菜单展示字段：中文名称 + 页面级 cache_flag（keepAlive）

UPDATE sys_menus SET menu_name = '系统管理', cache_flag = 0, affix_flag = 0
WHERE tenant_id = 1 AND menu_code = 'system.root' AND deleted_flag = 0;

UPDATE sys_menus SET menu_name = '用户管理', cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'system.users' AND deleted_flag = 0;

UPDATE sys_menus SET menu_name = '角色管理', cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'system.roles' AND deleted_flag = 0;

UPDATE sys_menus SET menu_name = '权限管理', cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'system.permissions' AND deleted_flag = 0;

UPDATE sys_menus SET menu_name = '菜单管理', cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'system.menus' AND deleted_flag = 0;

UPDATE sys_menus SET menu_name = '字典配置', cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'system.dicts' AND deleted_flag = 0;

UPDATE sys_menus SET menu_name = '系统客户端', cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'system.clients' AND deleted_flag = 0;

UPDATE sys_menus SET menu_name = '审计日志', cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'system.audit' AND deleted_flag = 0;

UPDATE sys_menus SET menu_name = '异步任务', cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'system.async' AND deleted_flag = 0;

UPDATE sys_menus SET menu_name = '数据权限', cache_flag = 1
WHERE tenant_id = 1 AND menu_code = 'system.data-scopes' AND deleted_flag = 0;

UPDATE sys_menus SET cache_flag = 0, affix_flag = 0
WHERE tenant_id = 1 AND menu_code IN ('owner.root', 'labeler.root', 'reviewer.root') AND deleted_flag = 0;

UPDATE sys_menus SET cache_flag = 1
WHERE tenant_id = 1 AND menu_code IN (
  'owner.tasks', 'owner.task-create', 'owner.templates', 'owner.exports', 'owner.settlements',
  'labeler.available', 'labeler.my-drafts', 'labeler.my-submitted',
  'reviewer.ai-queue', 'reviewer.audit-pool', 'reviewer.batch'
) AND deleted_flag = 0;
