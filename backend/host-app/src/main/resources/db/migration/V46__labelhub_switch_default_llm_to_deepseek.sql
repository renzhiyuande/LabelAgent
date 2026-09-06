-- LabelHub V46: 将默认真实联调目录切换到 DeepSeek，停用假的 doubao 演示目录

SET NAMES utf8mb4;

UPDATE llm_providers
SET
  is_default = CASE WHEN provider_code = 'deepseek' THEN 1 ELSE 0 END,
  status = CASE WHEN provider_code = 'doubao' THEN 'INACTIVE' ELSE status END,
  updated_at = NOW()
WHERE deleted_flag = 0
  AND provider_code IN ('deepseek', 'doubao');

UPDATE llm_models
SET
  is_default_for_provider = CASE WHEN model_code = 'deepseek-v4-flash' THEN 1 ELSE 0 END,
  status = CASE
    WHEN model_code IN ('doubao-pro', 'doubao-lite') THEN 'INACTIVE'
    ELSE status
  END,
  updated_at = NOW()
WHERE deleted_flag = 0
  AND model_code IN ('deepseek-v4-flash', 'doubao-pro', 'doubao-lite');
