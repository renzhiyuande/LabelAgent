import type { ReviewDimensionItem } from "@/features/template-designer/types/review-dimension";
import { buildDimensionSlotLine } from "./review-prompt-builder";

export interface ReviewPromptVariable {
  token: string;
  label: string;
  description?: string;
  group: string;
}

export const GLOBAL_REVIEW_PROMPT_VARIABLES: ReviewPromptVariable[] = [
  {
    token: "{{original_item_data}}",
    label: "原始题目数据",
    description: "导入/题面原始 JSON",
    group: "全局变量",
  },
  {
    token: "{{user_submission_data}}",
    label: "用户标注提交",
    description: "标注员提交的 JSON",
    group: "全局变量",
  },
];

const DIMENSION_FIELD_LABELS: Array<{ field: string; label: string }> = [
  { field: "prompt_instruction", label: "审核说明" },
  { field: "score_min", label: "最低分" },
  { field: "score_max", label: "最高分" },
  { field: "pass_threshold", label: "通过阈值" },
  { field: "reject_threshold", label: "驳回阈值" },
  { field: "weight", label: "权重" },
];

export function buildDimensionReviewPromptVariables(
  dimensions: ReviewDimensionItem[],
): ReviewPromptVariable[] {
  const variables: ReviewPromptVariable[] = [];

  for (const dimension of dimensions) {
    const name = dimension.dimensionName.trim();
    if (!name) {
      continue;
    }
    const group = `维度 · ${name}`;
    for (const { field, label } of DIMENSION_FIELD_LABELS) {
      variables.push({
        token: `{{dimension.${name}.${field}}}`,
        label: `${label}`,
        description: `维度「${name}」的 ${field}`,
        group,
      });
    }
    variables.push({
      token: buildDimensionSlotLine(name),
      label: "完整维度行",
      description: `[${name}] + prompt_instruction 插槽`,
      group: "维度块",
    });
  }

  return variables;
}

export function listReviewPromptVariables(dimensions: ReviewDimensionItem[]): ReviewPromptVariable[] {
  return [...GLOBAL_REVIEW_PROMPT_VARIABLES, ...buildDimensionReviewPromptVariables(dimensions)];
}

export function listReviewPromptVariableGroups(
  dimensions: ReviewDimensionItem[],
): Map<string, ReviewPromptVariable[]> {
  const groups = new Map<string, ReviewPromptVariable[]>();
  for (const variable of listReviewPromptVariables(dimensions)) {
    const items = groups.get(variable.group) ?? [];
    items.push(variable);
    groups.set(variable.group, items);
  }
  return groups;
}

export function buildAllDimensionSlotBlock(dimensions: ReviewDimensionItem[]): string {
  const lines = dimensions
    .map((item) => buildDimensionSlotLine(item.dimensionName))
    .filter(Boolean);
  if (lines.length === 0) {
    return "";
  }
  return `\n${lines.join("\n")}\n`;
}

/** 格式化 Prompt：统一换行、去除行尾空白、整理空行 */
export function formatReviewPromptTemplate(text: string): string {
  let result = text.replace(/\r\n/g, "\n");
  result = result
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.replace(/[ \t]+\n/g, "\n");
  const trimmed = result.trim();
  return trimmed ? `${trimmed}\n` : "";
}

export function insertTextAtSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  snippet: string,
): { nextValue: string; cursor: number } {
  const nextValue = value.slice(0, selectionStart) + snippet + value.slice(selectionEnd);
  const cursor = selectionStart + snippet.length;
  return { nextValue, cursor };
}
