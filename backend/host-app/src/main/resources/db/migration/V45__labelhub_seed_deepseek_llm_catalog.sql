-- LabelHub V45: 补充 DeepSeek Provider / Model 目录，用于真实 AI 预审联调
-- 注意：这里只种目录信息，不写入真实 API Key；密钥应通过后台配置或本地未提交配置注入

SET NAMES utf8mb4;

INSERT INTO llm_providers (
  id, tenant_id, created_by, updated_by, deleted_flag,
  provider_code, provider_name, base_url, api_key_ciphertext,
  is_system_provider, is_default, status
) VALUES (
  9200102, 1, 0, 0, 0,
  'deepseek', 'DeepSeek', 'https://api.deepseek.com', NULL,
  1, 0, 'ACTIVE'
)
ON DUPLICATE KEY UPDATE
  provider_name = VALUES(provider_name),
  base_url = VALUES(base_url),
  is_system_provider = VALUES(is_system_provider),
  status = VALUES(status),
  updated_at = NOW();

INSERT INTO llm_models (
  id, tenant_id, created_by, updated_by, deleted_flag,
  provider_id, model_code, model_name, model_type, model_version,
  context_window, max_output_tokens, is_default_for_provider, status
) VALUES (
  9200203, 1, 0, 0, 0,
  9200102, 'deepseek-v4-flash', 'DeepSeek V4 Flash', 'CHAT', 'v4',
  64000, 8192, 1, 'ACTIVE'
)
ON DUPLICATE KEY UPDATE
  model_name = VALUES(model_name),
  model_type = VALUES(model_type),
  model_version = VALUES(model_version),
  context_window = VALUES(context_window),
  max_output_tokens = VALUES(max_output_tokens),
  is_default_for_provider = VALUES(is_default_for_provider),
  status = VALUES(status),
  updated_at = NOW();
