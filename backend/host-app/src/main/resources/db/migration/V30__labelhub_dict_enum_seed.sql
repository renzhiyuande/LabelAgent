-- 统一枚举字典种子：status / type 等低代码 schema 通过 dict 引用

DELETE FROM sys_dict_items WHERE tenant_id = 1 AND dict_type_id IN (8001, 8002);

UPDATE sys_dict_types
SET dict_name = '任务状态', remark = '标注任务生命周期状态', updated_at = NOW()
WHERE tenant_id = 1 AND id = 8001;

UPDATE sys_dict_types
SET dict_name = '异步任务状态', remark = '异步任务执行状态', updated_at = NOW()
WHERE tenant_id = 1 AND id = 8002;

INSERT INTO sys_dict_types (id, tenant_id, created_by, updated_by, dict_code, dict_name, status, remark) VALUES
  (8030, 1, 0, 0, 'common_status', '通用启用状态', 'ACTIVE', '用户/角色/字典类型等 ACTIVE/DISABLED'),
  (8031, 1, 0, 0, 'provider_status', '提供商状态', 'ACTIVE', 'LLM/维度包等 ACTIVE/INACTIVE'),
  (8032, 1, 0, 0, 'enabled_flag', '启用标志', 'ACTIVE', '定时任务等 1/0 启用标志'),
  (8033, 1, 0, 0, 'submission_status', '提交状态', 'ACTIVE', '标注提交流转状态'),
  (8034, 1, 0, 0, 'template_version_status', '模板版本状态', 'ACTIVE', '模板版本 DRAFT/PUBLISHED'),
  (8035, 1, 0, 0, 'template_market_status', '模板市场审核状态', 'ACTIVE', '模板市场上架审核'),
  (8036, 1, 0, 0, 'assignment_status', '分配状态', 'ACTIVE', '任务分配认领状态'),
  (8037, 1, 0, 0, 'assignment_type', '分配类型', 'ACTIVE', '手动分配/自动认领'),
  (8038, 1, 0, 0, 'menu_type', '菜单类型', 'ACTIVE', '系统菜单 MENU/BUTTON'),
  (8039, 1, 0, 0, 'dimension_type', '维度类型', 'ACTIVE', '审核维度包维度类型'),
  (8040, 1, 0, 0, 'llm_provider_code', 'LLM 提供商编码', 'ACTIVE', 'LLM 提供商类型编码')
ON DUPLICATE KEY UPDATE
  dict_name = VALUES(dict_name),
  status = VALUES(status),
  remark = VALUES(remark),
  updated_at = NOW();

INSERT INTO sys_dict_items (id, tenant_id, created_by, updated_by, dict_type_id, item_code, item_label, item_value, sort_no, is_default, status, ext_json) VALUES
  (8101, 1, 0, 0, 8001, 'DRAFT', '草稿', 'DRAFT', 1, 1, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8102, 1, 0, 0, 8001, 'PUBLISHED', '已发布', 'PUBLISHED', 2, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8103, 1, 0, 0, 8001, 'PAUSED', '已暂停', 'PAUSED', 3, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),
  (8104, 1, 0, 0, 8001, 'FINISHED', '已完成', 'FINISHED', 4, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8105, 1, 0, 0, 8001, 'ARCHIVED', '已归档', 'ARCHIVED', 5, 0, 'ACTIVE', '{"tone":"muted","className":"lh-tag muted"}'),

  (8201, 1, 0, 0, 8002, 'PENDING', '待处理', 'PENDING', 1, 1, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8202, 1, 0, 0, 8002, 'RUNNING', '运行中', 'RUNNING', 2, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),
  (8203, 1, 0, 0, 8002, 'SUCCESS', '成功', 'SUCCESS', 3, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8204, 1, 0, 0, 8002, 'FAILED', '失败', 'FAILED', 4, 0, 'ACTIVE', '{"tone":"destructive","className":"lh-tag destructive"}'),
  (8205, 1, 0, 0, 8002, 'DEAD_LETTER', '死信', 'DEAD_LETTER', 5, 0, 'ACTIVE', '{"tone":"destructive","className":"lh-tag destructive"}'),
  (8206, 1, 0, 0, 8002, 'CANCELED', '已取消', 'CANCELED', 6, 0, 'ACTIVE', '{"tone":"muted","className":"lh-tag muted"}'),

  (8301, 1, 0, 0, 8030, 'ACTIVE', '启用', 'ACTIVE', 1, 1, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8302, 1, 0, 0, 8030, 'DISABLED', '禁用', 'DISABLED', 2, 0, 'ACTIVE', '{"tone":"muted","className":"lh-tag muted"}'),

  (8311, 1, 0, 0, 8031, 'ACTIVE', '启用', 'ACTIVE', 1, 1, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8312, 1, 0, 0, 8031, 'INACTIVE', '禁用', 'INACTIVE', 2, 0, 'ACTIVE', '{"tone":"muted","className":"lh-tag muted"}'),

  (8321, 1, 0, 0, 8032, 'ENABLED', '启用', '1', 1, 1, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8322, 1, 0, 0, 8032, 'DISABLED', '禁用', '0', 2, 0, 'ACTIVE', '{"tone":"muted","className":"lh-tag muted"}'),

  (8331, 1, 0, 0, 8033, 'DRAFT', '草稿', 'DRAFT', 1, 1, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8332, 1, 0, 0, 8033, 'SUBMITTED', '已提交', 'SUBMITTED', 2, 0, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8333, 1, 0, 0, 8033, 'AI_REVIEWING', 'AI审核中', 'AI_REVIEWING', 3, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),
  (8334, 1, 0, 0, 8033, 'NEEDS_REVISION', '需修改', 'NEEDS_REVISION', 4, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),
  (8335, 1, 0, 0, 8033, 'APPROVED', '已通过', 'APPROVED', 5, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8336, 1, 0, 0, 8033, 'REJECTED', '已拒绝', 'REJECTED', 6, 0, 'ACTIVE', '{"tone":"destructive","className":"lh-tag destructive"}'),

  (8341, 1, 0, 0, 8034, 'DRAFT', '草稿', 'DRAFT', 1, 1, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8342, 1, 0, 0, 8034, 'PUBLISHED', '已发布', 'PUBLISHED', 2, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),

  (8351, 1, 0, 0, 8035, 'PENDING', '待审核', 'PENDING', 1, 1, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),
  (8352, 1, 0, 0, 8035, 'APPROVED', '已通过', 'APPROVED', 2, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8353, 1, 0, 0, 8035, 'REJECTED', '已拒绝', 'REJECTED', 3, 0, 'ACTIVE', '{"tone":"destructive","className":"lh-tag destructive"}'),

  (8361, 1, 0, 0, 8036, 'UNCLAIMED', '待认领', 'UNCLAIMED', 1, 1, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8362, 1, 0, 0, 8036, 'CLAIMED', '答题中', 'CLAIMED', 2, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),
  (8363, 1, 0, 0, 8036, 'SUBMITTED', '已提交', 'SUBMITTED', 3, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8364, 1, 0, 0, 8036, 'EXPIRED', '已过期', 'EXPIRED', 4, 0, 'ACTIVE', '{"tone":"muted","className":"lh-tag muted"}'),
  (8365, 1, 0, 0, 8036, 'CANCELLED', '已取消', 'CANCELLED', 5, 0, 'ACTIVE', '{"tone":"muted","className":"lh-tag muted"}'),

  (8371, 1, 0, 0, 8037, 'MANUAL_ASSIGN', '手动分配', 'MANUAL_ASSIGN', 1, 1, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8372, 1, 0, 0, 8037, 'AUTO_CLAIM', '自动认领', 'AUTO_CLAIM', 2, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),

  (8381, 1, 0, 0, 8038, 'MENU', '菜单', 'MENU', 1, 1, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8382, 1, 0, 0, 8038, 'BUTTON', '按钮', 'BUTTON', 2, 0, 'ACTIVE', '{"tone":"muted","className":"lh-tag muted"}'),

  (8391, 1, 0, 0, 8039, 'SCORE', '评分', 'SCORE', 1, 1, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8392, 1, 0, 0, 8039, 'BOOLEAN', '是否', 'BOOLEAN', 2, 0, 'ACTIVE', '{"tone":"success","className":"lh-tag success"}'),
  (8393, 1, 0, 0, 8039, 'TEXT', '文本', 'TEXT', 3, 0, 'ACTIVE', '{"tone":"neutral","className":"lh-tag neutral"}'),
  (8394, 1, 0, 0, 8039, 'TAG', '标签', 'TAG', 4, 0, 'ACTIVE', '{"tone":"warning","className":"lh-tag warning"}'),

  (8401, 1, 0, 0, 8040, 'openai', 'OpenAI', 'openai', 1, 1, 'ACTIVE', NULL),
  (8402, 1, 0, 0, 8040, 'anthropic', 'Anthropic Claude', 'anthropic', 2, 0, 'ACTIVE', NULL),
  (8403, 1, 0, 0, 8040, 'google', 'Google Gemini', 'google', 3, 0, 'ACTIVE', NULL),
  (8404, 1, 0, 0, 8040, 'alibaba', 'Alibaba Qwen', 'alibaba', 4, 0, 'ACTIVE', NULL),
  (8405, 1, 0, 0, 8040, 'custom', 'Custom Provider', 'custom', 5, 0, 'ACTIVE', NULL)
ON DUPLICATE KEY UPDATE
  item_label = VALUES(item_label),
  item_value = VALUES(item_value),
  sort_no = VALUES(sort_no),
  is_default = VALUES(is_default),
  status = VALUES(status),
  ext_json = VALUES(ext_json),
  updated_at = NOW();
