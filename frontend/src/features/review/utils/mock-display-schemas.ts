import { createDisplayFormSchema } from "@/components/workbench/shared/schema-data/create-display-schema";
import type { FormSchema } from "@/low-code/schema/types";

export const MOCK_AI_QUEUE_PAYLOAD_SCHEMA: FormSchema = createDisplayFormSchema(
  "payload",
  "题目导入字段",
  [
    { key: "cleaned_title", label: "清洗后标题", component: "text" },
    { key: "category", label: "类目", component: "text" },
    { key: "keywords", label: "关键词", component: "tags" },
    { key: "raw_text", label: "原始文本", component: "textarea" },
    { key: "seq_no", label: "题序", component: "number" },
  ],
);

export const MOCK_AI_QUEUE_ANNOTATE_SCHEMA: FormSchema = createDisplayFormSchema(
  "annotate",
  "标注作答字段",
  [
    { key: "quality_score", label: "质量评分", component: "number" },
    { key: "tags", label: "标注标签", component: "tags" },
    { key: "reviewer_note", label: "标注备注", component: "textarea" },
  ],
);

export const MOCK_MANUAL_REVIEW_PAYLOAD_SCHEMA: FormSchema = MOCK_AI_QUEUE_PAYLOAD_SCHEMA;

export const MOCK_MANUAL_REVIEW_ANNOTATE_SCHEMA: FormSchema = createDisplayFormSchema(
  "annotate",
  "标注结果",
  [
    { key: "quality_score", label: "质量评分", component: "number" },
    { key: "tags", label: "标注标签", component: "tags" },
    { key: "note", label: "标注说明", component: "textarea" },
  ],
);
