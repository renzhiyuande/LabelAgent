-- LabelHub 默认审核维度包种子
-- 空库初始化时仅保留系统内置 pack 种子；历史模板版本回填逻辑不再需要

SET NAMES utf8mb4;

-- ========================================
-- Step 1: 系统内置默认维度包
-- ========================================
INSERT IGNORE INTO template_review_dimension_packs (
  id, tenant_id, created_by, updated_by, deleted_flag,
  pack_code, pack_name, pack_desc, scene_code, is_system_pack,
  dimension_specs_json, sort_no, status
) VALUES (
  9100001, 1, 0, 0, 0,
  'GENERAL_QUALITY_V1', '通用质量审核维度包', '适用于大多数标注任务的通用四维质量审核模板', 'GENERAL', 1,
  CAST('[
    {"dimensionCode":"COMPLETENESS","dimensionName":"完整性","dimensionType":"SCORE","weight":1,"sortNo":1,"status":"ACTIVE","scoreMin":0,"scoreMax":100,"passThreshold":80,"rejectThreshold":50,"promptInstruction":"检查标注是否覆盖题面要求的全部字段，无遗漏项。"},
    {"dimensionCode":"ACCURACY","dimensionName":"准确性","dimensionType":"SCORE","weight":1,"sortNo":2,"status":"ACTIVE","scoreMin":0,"scoreMax":100,"passThreshold":85,"rejectThreshold":55,"promptInstruction":"检查标注内容与原始数据或事实是否一致，无明显错误或臆造。"},
    {"dimensionCode":"FORMAT","dimensionName":"格式合规","dimensionType":"SCORE","weight":1,"sortNo":3,"status":"ACTIVE","scoreMin":0,"scoreMax":100,"passThreshold":90,"rejectThreshold":60,"promptInstruction":"检查标注格式、枚举取值、长度与正则规则是否符合模板约束。"},
    {"dimensionCode":"SAFETY","dimensionName":"安全性","dimensionType":"SCORE","weight":1,"sortNo":4,"status":"ACTIVE","scoreMin":0,"scoreMax":100,"passThreshold":100,"rejectThreshold":70,"promptInstruction":"检查是否包含政治敏感、色情、暴力、违法等违规内容。"}
  ]' AS JSON),
  10, 'ACTIVE'
),
(
  9100002, 1, 0, 0, 0,
  'ECOMMERCE_TITLE_V1', '电商标题审核维度包', '适用于电商商品标题标注审核的标准四维模板', 'ECOMMERCE_TITLE', 1,
  CAST('[
    {"dimensionCode":"RELEVANCE","dimensionName":"相关性","dimensionType":"SCORE","weight":1,"sortNo":1,"status":"ACTIVE","scoreMin":0,"scoreMax":100,"passThreshold":80,"rejectThreshold":50,"promptInstruction":"检查标注标题描述与原始商品图片/信息是否高度相关。"},
    {"dimensionCode":"ACCURACY","dimensionName":"准确性","dimensionType":"SCORE","weight":1,"sortNo":2,"status":"ACTIVE","scoreMin":0,"scoreMax":100,"passThreshold":85,"rejectThreshold":55,"promptInstruction":"检查商品类目、关键词与官方事实是否完全一致。"},
    {"dimensionCode":"FORMAT","dimensionName":"格式合规","dimensionType":"SCORE","weight":1,"sortNo":3,"status":"ACTIVE","scoreMin":0,"scoreMax":100,"passThreshold":90,"rejectThreshold":60,"promptInstruction":"检查标题长度、字符集、特殊符号等是否符合平台格式规范。"},
    {"dimensionCode":"SAFETY","dimensionName":"安全性","dimensionType":"SCORE","weight":1,"sortNo":4,"status":"ACTIVE","scoreMin":0,"scoreMax":100,"passThreshold":100,"rejectThreshold":70,"promptInstruction":"绝对不能包含政治敏感词、色情、暴力等违规内容。"}
  ]' AS JSON),
  20, 'ACTIVE'
);
