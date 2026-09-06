import {
  DEFAULT_REVIEW_WORKFLOW_LEVELS,
  type ReviewWorkflowAction,
  type ReviewWorkflowLevelItem,
} from "./review-workflow-types";

const ALLOWED_ACTIONS = new Set<ReviewWorkflowAction>(["approve", "reject", "return"]);

function normalizeAction(value: unknown): ReviewWorkflowAction | null {
  if (typeof value !== "string") {
    return null;
  }
  const action = value.trim().toLowerCase() as ReviewWorkflowAction;
  return ALLOWED_ACTIONS.has(action) ? action : null;
}

export function parseReviewWorkflowLevels(raw: unknown): ReviewWorkflowLevelItem[] {
  if (!raw || typeof raw !== "object") {
    return [...DEFAULT_REVIEW_WORKFLOW_LEVELS];
  }
  const levelsNode = (raw as { levels?: unknown }).levels;
  if (!Array.isArray(levelsNode) || levelsNode.length === 0) {
    return [...DEFAULT_REVIEW_WORKFLOW_LEVELS];
  }
  const parsed: ReviewWorkflowLevelItem[] = [];
  for (const item of levelsNode) {
    if (typeof item === "string" && item.trim()) {
      parsed.push({
        key: item.trim(),
        label: item.trim(),
        actions: ["approve", "reject", "return"],
      });
      continue;
    }
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    const key = row.key != null ? String(row.key).trim() : "";
    if (!key) {
      continue;
    }
    const label = row.label != null ? String(row.label).trim() : key;
    const actions = Array.isArray(row.actions)
      ? row.actions.map(normalizeAction).filter((action): action is ReviewWorkflowAction => action != null)
      : [];
    parsed.push({
      key,
      label: label || key,
      actions: actions.length > 0 ? actions : ["approve", "reject", "return"],
    });
  }
  return parsed.length > 0 ? parsed : [...DEFAULT_REVIEW_WORKFLOW_LEVELS];
}

export function parseReviewWorkflowLevelsFromDetail(detail: Record<string, unknown>): ReviewWorkflowLevelItem[] {
  if (Array.isArray(detail.reviewWorkflowLevels)) {
    return detail.reviewWorkflowLevels
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null;
        }
        const item = row as Record<string, unknown>;
        const key = item.key != null ? String(item.key).trim() : "";
        if (!key) {
          return null;
        }
        const label = item.label != null ? String(item.label).trim() : key;
        const actions = Array.isArray(item.actions)
          ? item.actions.map(normalizeAction).filter((action): action is ReviewWorkflowAction => action != null)
          : [];
        return {
          key,
          label,
          actions: actions.length > 0 ? actions : ["approve", "reject", "return"],
        } satisfies ReviewWorkflowLevelItem;
      })
      .filter((item): item is ReviewWorkflowLevelItem => item != null);
  }
  if (detail.reviewWorkflowJson != null) {
    try {
      const json =
        typeof detail.reviewWorkflowJson === "string"
          ? JSON.parse(detail.reviewWorkflowJson)
          : detail.reviewWorkflowJson;
      return parseReviewWorkflowLevels(json);
    } catch {
      return [...DEFAULT_REVIEW_WORKFLOW_LEVELS];
    }
  }
  return [...DEFAULT_REVIEW_WORKFLOW_LEVELS];
}

export function validateReviewWorkflowLevels(levels: ReviewWorkflowLevelItem[]): string | null {
  if (levels.length === 0) {
    return "至少配置一级人工审核";
  }
  if (levels.length > 5) {
    return "人工审核最多 5 级";
  }
  for (let index = 0; index < levels.length; index += 1) {
    const expectedKey = `L${index + 1}`;
    const level = levels[index];
    if (level.key !== expectedKey) {
      return `审核级别须连续，第 ${index + 1} 级应为 ${expectedKey}`;
    }
    if (!level.label.trim()) {
      return `${level.key} 须填写展示名称`;
    }
    if (level.actions.length === 0) {
      return `${level.key} 须至少选择一个操作`;
    }
  }
  return null;
}

export function buildReviewWorkflowPayload(levels: ReviewWorkflowLevelItem[]) {
  return {
    levels: levels.map((level) => ({
      key: level.key,
      label: level.label.trim(),
      actions: level.actions,
    })),
  };
}

export function createNextWorkflowLevel(levels: ReviewWorkflowLevelItem[]): ReviewWorkflowLevelItem | null {
  if (levels.length >= 5) {
    return null;
  }
  const nextIndex = levels.length + 1;
  return {
    key: `L${nextIndex}`,
    label: nextIndex === 2 ? "复审" : nextIndex === 3 ? "终审" : `第${nextIndex}审`,
    actions: ["approve", "reject", "return"],
  };
}
