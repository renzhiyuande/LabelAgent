import type { ReviewDimensionItem } from "@/features/template-designer/types/review-dimension";

function toNumber(value: unknown, fallback: number): number {
  if (value == null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readField(raw: Record<string, unknown>, camel: string, snake: string): unknown {
  if (raw[camel] !== undefined) {
    return raw[camel];
  }
  return raw[snake];
}

export function normalizeReviewDimension(raw: Record<string, unknown>): ReviewDimensionItem {
  return {
    id: readField(raw, "id", "id") != null ? Number(readField(raw, "id", "id")) : null,
    templateVersionId:
      readField(raw, "templateVersionId", "template_version_id") != null
        ? Number(readField(raw, "templateVersionId", "template_version_id"))
        : null,
    dimensionKey: String(readField(raw, "dimensionKey", "dimension_key") ?? ""),
    dimensionName: String(readField(raw, "dimensionName", "dimension_name") ?? ""),
    dimensionDesc:
      readField(raw, "dimensionDesc", "dimension_desc") != null
        ? String(readField(raw, "dimensionDesc", "dimension_desc"))
        : null,
    weight: toNumber(readField(raw, "weight", "weight"), 0),
    scoreMin: toNumber(readField(raw, "scoreMin", "score_min"), 0),
    scoreMax: toNumber(readField(raw, "scoreMax", "score_max"), 100),
    passThreshold:
      readField(raw, "passThreshold", "pass_threshold") != null
        ? toNumber(readField(raw, "passThreshold", "pass_threshold"), 0)
        : null,
    rejectThreshold:
      readField(raw, "rejectThreshold", "reject_threshold") != null
        ? toNumber(readField(raw, "rejectThreshold", "reject_threshold"), 0)
        : null,
    promptInstruction:
      readField(raw, "promptInstruction", "prompt_instruction") != null
        ? String(readField(raw, "promptInstruction", "prompt_instruction"))
        : null,
    manualReviewHint:
      readField(raw, "manualReviewHint", "manual_review_hint") != null
        ? String(readField(raw, "manualReviewHint", "manual_review_hint"))
        : null,
    severityLevel: String(readField(raw, "severityLevel", "severity_level") ?? "MEDIUM"),
    sortNo: toNumber(readField(raw, "sortNo", "sort_no"), 0),
    requiredFlag: toNumber(readField(raw, "requiredFlag", "required_flag"), 1),
  };
}

export function createEmptyReviewDimension(sortNo = 1): ReviewDimensionItem {
  return {
    dimensionKey: "",
    dimensionName: "",
    weight: 0,
    scoreMin: 0,
    scoreMax: 100,
    passThreshold: 80,
    rejectThreshold: 50,
    promptInstruction: "",
    severityLevel: "MEDIUM",
    sortNo,
    requiredFlag: 1,
  };
}

export function sumReviewDimensionWeights(items: ReviewDimensionItem[]): number {
  return items.reduce((total, item) => total + (Number.isFinite(item.weight) ? item.weight : 0), 0);
}

export function toReviewDimensionPayload(items: ReviewDimensionItem[]): ReviewDimensionItem[] {
  return items.map((item, index) => ({
    ...item,
    sortNo: index + 1,
    dimensionKey: item.dimensionKey.trim(),
    dimensionName: item.dimensionName.trim(),
    promptInstruction: item.promptInstruction?.trim() || null,
    manualReviewHint: item.manualReviewHint?.trim() || null,
  }));
}

export function validateReviewDimensions(items: ReviewDimensionItem[]): string | null {
  if (items.length === 0) {
    return null;
  }
  for (const item of items) {
    if (!item.dimensionKey.trim()) {
      return "请填写所有维度的编码";
    }
    if (!item.dimensionName.trim()) {
      return "请填写所有维度的名称";
    }
  }
  const keys = items.map((item) => item.dimensionKey.trim());
  if (new Set(keys).size !== keys.length) {
    return "维度编码不能重复";
  }
  const totalWeight = sumReviewDimensionWeights(items);
  if (Math.abs(totalWeight - 100) > 0.01) {
    return `维度权重总和须为 100，当前为 ${totalWeight.toFixed(2)}`;
  }
  return null;
}
