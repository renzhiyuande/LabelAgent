-- 任务导入数据契约：requiredKeys（display 必填）/ optionalKeys（input 可选）
ALTER TABLE `tasks`
  ADD COLUMN `import_payload_contract_json` JSON NULL COMMENT '导入列契约 requiredKeys/optionalKeys' AFTER `settings_json`;
