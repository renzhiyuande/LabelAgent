-- LabelHub 默认 LLM 提供商与模型目录种子
-- 与 template_versions / 测试流水中 doubao + doubao-pro 约定一致

SET NAMES utf8mb4;

INSERT INTO sys_dict_types (id, tenant_id, created_by, updated_by, dict_code, dict_name, status, remark) VALUES
  (8041, 1, 0, 0, 'llm_model_type', 'LLM 模型类型', 'ACTIVE', 'CHAT/COMPLETION/REVIEW 等')
ON DUPLICATE KEY UPDATE
  dict_name = VALUES(dict_name),
  status = VALUES(status),
  remark = VALUES(remark),
  updated_at = NOW();

INSERT INTO sys_dict_items (id, tenant_id, created_by, updated_by, dict_type_id, item_code, item_label, item_value, sort_no, is_default, status) VALUES
  (8411, 1, 0, 0, 8041, 'CHAT', '对话', 'CHAT', 1, 1, 'ACTIVE'),
  (8412, 1, 0, 0, 8041, 'COMPLETION', '补全', 'COMPLETION', 2, 0, 'ACTIVE'),
  (8413, 1, 0, 0, 8041, 'REVIEW', '审核', 'REVIEW', 3, 0, 'ACTIVE'),
  (8414, 1, 0, 0, 8041, 'EMBEDDING', '向量', 'EMBEDDING', 4, 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE
  item_label = VALUES(item_label),
  item_value = VALUES(item_value),
  sort_no = VALUES(sort_no),
  is_default = VALUES(is_default),
  status = VALUES(status),
  updated_at = NOW();

INSERT IGNORE INTO llm_providers (
  id, tenant_id, created_by, updated_by, deleted_flag,
  provider_code, provider_name, base_url, api_key_ciphertext,
  is_system_provider, is_default, status
) VALUES (
  9200101, 1, 0, 0, 0,
  'doubao', '火山引擎 Doubao', 'https://ark.cn-beijing.volces.com/api/v3', NULL,
  1, 1, 'ACTIVE'
);

INSERT IGNORE INTO llm_models (
  id, tenant_id, created_by, updated_by, deleted_flag,
  provider_id, model_code, model_name, model_type, model_version,
  context_window, max_output_tokens, is_default_for_provider, status
) VALUES
  (9200201, 1, 0, 0, 0, 9200101, 'doubao-pro', 'Doubao Pro', 'CHAT', 'v1', 128000, 4096, 1, 'ACTIVE'),
  (9200202, 1, 0, 0, 0, 9200101, 'doubao-lite', 'Doubao Lite', 'CHAT', 'v1', 32000, 4096, 0, 'ACTIVE');
