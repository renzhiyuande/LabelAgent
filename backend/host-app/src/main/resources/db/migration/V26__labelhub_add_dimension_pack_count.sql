-- LabelHub V26: template_review_dimension_packs 补齐 dimension_count 列（与 Entity 对齐）

SET NAMES utf8mb4;

ALTER TABLE `template_review_dimension_packs`
  ADD COLUMN `dimension_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT '维度项数量（与 dimension_specs_json 数组长度一致）'
    AFTER `dimension_specs_json`;

UPDATE `template_review_dimension_packs`
SET `dimension_count` = COALESCE(JSON_LENGTH(`dimension_specs_json`), 0)
WHERE `dimension_count` = 0;
