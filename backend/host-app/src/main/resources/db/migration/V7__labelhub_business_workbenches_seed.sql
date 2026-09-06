-- LabelHub V7: 业务工作台三个角色菜单树种子数据
-- 生成日期: 2026-05-24
-- 用途: 预置 Owner/Labeler/Reviewer 三个专属工作台的完整导航菜单 + 业务权限点

-- ========================================
-- Step 1: 业务领域权限点定义
-- ========================================
INSERT IGNORE INTO permissions (id, tenant_id, created_by, updated_by, permission_code, permission_name, module_code, api_pattern, status) VALUES
  (10001, 1, 0, 0, 'business:task:create', 'Create Task', 'BUSINESS', '/api/v1/owner/tasks', 'ACTIVE'),
  (10002, 1, 0, 0, 'business:task:read', 'Read Task', 'BUSINESS', '/api/v1/owner/tasks/**', 'ACTIVE'),
  (10003, 1, 0, 0, 'business:task:update', 'Update Task', 'BUSINESS', '/api/v1/owner/tasks/**', 'ACTIVE'),
  (10004, 1, 0, 0, 'business:task:publish', 'Publish Task', 'BUSINESS', '/api/v1/owner/tasks/*/publish', 'ACTIVE'),
  (10005, 1, 0, 0, 'business:template:manage', 'Manage Template', 'BUSINESS', '/api/v1/owner/templates/**', 'ACTIVE'),
  (10006, 1, 0, 0, 'business:export:manage', 'Manage Export', 'BUSINESS', '/api/v1/owner/exports/**', 'ACTIVE'),
  (10007, 1, 0, 0, 'business:settlement:read', 'Read Settlement', 'BUSINESS', '/api/v1/owner/settlements/**', 'ACTIVE'),
  (10008, 1, 0, 0, 'business:labeler:workbench', 'Labeler Workbench Access', 'BUSINESS', '/api/v1/labeler/**', 'ACTIVE'),
  (10009, 1, 0, 0, 'business:reviewer:workbench', 'Reviewer Workbench Access', 'BUSINESS', '/api/v1/reviewer/**', 'ACTIVE');

-- ========================================
-- Step 2: 将业务权限授予对应角色
-- ========================================
INSERT IGNORE INTO role_permissions (id, tenant_id, created_by, updated_by, role_id, permission_id, grant_source) VALUES
  (10101, 1, 0, 0, 2001, 10001, 'SYSTEM'),
  (10102, 1, 0, 0, 2001, 10002, 'SYSTEM'),
  (10103, 1, 0, 0, 2001, 10003, 'SYSTEM'),
  (10104, 1, 0, 0, 2001, 10004, 'SYSTEM'),
  (10105, 1, 0, 0, 2001, 10005, 'SYSTEM'),
  (10106, 1, 0, 0, 2001, 10006, 'SYSTEM'),
  (10107, 1, 0, 0, 2001, 10007, 'SYSTEM'),
  (10108, 1, 0, 0, 2003, 10008, 'SYSTEM'),
  (10109, 1, 0, 0, 2004, 10009, 'SYSTEM');

-- ========================================
-- Step 3: 三个业务工作台菜单树
-- ========================================

-- 3.1 Owner 数据生产中心根菜单
INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (20001, 1, 0, 0, 'owner.root', '数据生产中心', 'MENU', 0, '/owner', 'owner', 'layouts/OwnerLayout', 'factory',
   'business:task:read', 1, 0, 0, 0, 'INTERNAL', 10, 'ACTIVE'),
  (20002, 1, 0, 0, 'owner.tasks', '任务管理', 'MENU', 20001, '/owner/tasks', 'owner-tasks', 'pages/owner/tasks', 'list-checks',
   'business:task:read', 1, 0, 0, 0, 'INTERNAL', 10, 'ACTIVE'),
  (20003, 1, 0, 0, 'owner.task-create', '创建任务', 'MENU', 20001, '/owner/tasks/create', 'owner-task-create', 'pages/owner/task-create', 'plus',
   'business:task:create', 1, 0, 0, 0, 'INTERNAL', 20, 'ACTIVE'),
  (20004, 1, 0, 0, 'owner.templates', '模板搭建', 'MENU', 20001, '/owner/templates', 'owner-templates', 'pages/owner/templates', 'layout-template',
   'business:template:manage', 1, 0, 0, 0, 'INTERNAL', 30, 'ACTIVE'),
  (20005, 1, 0, 0, 'owner.exports', '数据导出', 'MENU', 20001, '/owner/exports', 'owner-exports', 'pages/owner/exports', 'download',
   'business:export:manage', 1, 0, 0, 0, 'INTERNAL', 40, 'ACTIVE'),
  (20006, 1, 0, 0, 'owner.settlements', '奖励结算', 'MENU', 20001, '/owner/settlements', 'owner-settlements', 'pages/owner/settlements', 'wallet',
   'business:settlement:read', 1, 0, 0, 0, 'INTERNAL', 50, 'ACTIVE');

-- 3.2 Labeler 标注工作台根菜单
INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (30001, 1, 0, 0, 'labeler.root', '标注工作台', 'MENU', 0, '/labeler', 'labeler', 'layouts/LabelerLayout', 'pencil-line',
   'business:labeler:workbench', 1, 0, 0, 0, 'INTERNAL', 11, 'ACTIVE'),
  (30002, 1, 0, 0, 'labeler.available', '任务广场', 'MENU', 30001, '/labeler/available', 'labeler-available', 'pages/labeler/available', 'store',
   'business:labeler:workbench', 1, 0, 0, 0, 'INTERNAL', 10, 'ACTIVE'),
  (30003, 1, 0, 0, 'labeler.my-drafts', '我的草稿', 'MENU', 30001, '/labeler/my-drafts', 'labeler-my-drafts', 'pages/labeler/my-drafts', 'file-text',
   'business:labeler:workbench', 1, 0, 0, 0, 'INTERNAL', 20, 'ACTIVE'),
  (30004, 1, 0, 0, 'labeler.my-submitted', '已提交历史', 'MENU', 30001, '/labeler/my-submitted', 'labeler-my-submitted', 'pages/labeler/my-submitted', 'check-circle',
   'business:labeler:workbench', 1, 0, 0, 0, 'INTERNAL', 30, 'ACTIVE');

-- 3.3 Reviewer 审核工作台根菜单
INSERT IGNORE INTO sys_menus (
  id, tenant_id, created_by, updated_by, menu_code, menu_name, menu_type, parent_id, path, route_name, component_path, icon,
  permission_code, visible_flag, disabled_flag, cache_flag, affix_flag, open_mode, sort_no, status
) VALUES
  (40001, 1, 0, 0, 'reviewer.root', '审核工作台', 'MENU', 0, '/reviewer', 'reviewer', 'layouts/ReviewerLayout', 'check-square',
   'business:reviewer:workbench', 1, 0, 0, 0, 'INTERNAL', 12, 'ACTIVE'),
  (40002, 1, 0, 0, 'reviewer.ai-queue', 'AI待审队列', 'MENU', 40001, '/reviewer/ai-queue', 'reviewer-ai-queue', 'pages/reviewer/ai-queue', 'bot',
   'business:reviewer:workbench', 1, 0, 0, 0, 'INTERNAL', 10, 'ACTIVE'),
  (40003, 1, 0, 0, 'reviewer.audit-pool', '人工审核池', 'MENU', 40001, '/reviewer/audit-pool', 'reviewer-audit-pool', 'pages/reviewer/audit-pool', 'users-check',
   'business:reviewer:workbench', 1, 0, 0, 0, 'INTERNAL', 20, 'ACTIVE'),
  (40004, 1, 0, 0, 'reviewer.batch', '批量审核', 'MENU', 40001, '/reviewer/batch', 'reviewer-batch', 'pages/reviewer/batch', 'layers',
   'business:reviewer:workbench', 1, 0, 0, 0, 'INTERNAL', 30, 'ACTIVE');

-- ========================================
-- Step 4: 将菜单授权给对应角色
-- ========================================
INSERT IGNORE INTO role_menus (id, tenant_id, created_by, updated_by, role_id, menu_id, grant_scope) VALUES
  -- Owner 获取全部数据生产中心菜单
  (20101, 1, 0, 0, 2001, 20001, 'VISIBLE'),
  (20102, 1, 0, 0, 2001, 20002, 'VISIBLE'),
  (20103, 1, 0, 0, 2001, 20003, 'VISIBLE'),
  (20104, 1, 0, 0, 2001, 20004, 'VISIBLE'),
  (20105, 1, 0, 0, 2001, 20005, 'VISIBLE'),
  (20106, 1, 0, 0, 2001, 20006, 'VISIBLE'),
  -- Labeler 获取全部标注工作台菜单
  (30101, 1, 0, 0, 2003, 30001, 'VISIBLE'),
  (30102, 1, 0, 0, 2003, 30002, 'VISIBLE'),
  (30103, 1, 0, 0, 2003, 30003, 'VISIBLE'),
  (30104, 1, 0, 0, 2003, 30004, 'VISIBLE'),
  -- Reviewer 获取全部审核工作台菜单
  (40101, 1, 0, 0, 2004, 40001, 'VISIBLE'),
  (40102, 1, 0, 0, 2004, 40002, 'VISIBLE'),
  (40103, 1, 0, 0, 2004, 40003, 'VISIBLE'),
  (40104, 1, 0, 0, 2004, 40004, 'VISIBLE');
