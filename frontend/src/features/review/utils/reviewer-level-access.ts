import type { AuditPoolLevelCountResponse } from "../api/reviewer-workbench-api";

export const REVIEWER_LEVEL_PERMISSION_PREFIX = "business:reviewer:level:";

export interface ReviewerAccessibleLevel {
  key: string;
  label: string;
}

export interface ReviewerLevelAccessSummary {
  unrestricted: boolean;
  levels: ReviewerAccessibleLevel[];
}

const DEFAULT_LEVEL_LABELS: Record<string, string> = {
  L1: "初审",
  L2: "复审",
  L3: "终审",
};

function labelForLevelKey(key: string, levelMeta?: AuditPoolLevelCountResponse[]): string {
  const fromMeta = levelMeta?.find((level) => level.levelKey === key)?.levelLabel;
  if (fromMeta?.trim()) {
    return fromMeta.trim();
  }
  return DEFAULT_LEVEL_LABELS[key] ?? key;
}

export function parseGrantedReviewLevelKeys(permissions: string[]): string[] {
  return permissions
    .filter((code) => code.startsWith(REVIEWER_LEVEL_PERMISSION_PREFIX))
    .map((code) => code.slice(REVIEWER_LEVEL_PERMISSION_PREFIX.length).trim())
    .filter(Boolean)
    .sort((left, right) => {
      const leftNo = Number(left.replace(/\D/g, "")) || 0;
      const rightNo = Number(right.replace(/\D/g, "")) || 0;
      return leftNo - rightNo;
    });
}

export function hasUnrestrictedReviewLevels(permissions: string[]): boolean {
  if (permissions.length === 0) {
    return true;
  }
  if (permissions.includes("system:admin")) {
    return true;
  }
  return !permissions.some((code) => code.startsWith(REVIEWER_LEVEL_PERMISSION_PREFIX));
}

/** 与后端 ReviewerReviewLevelAccess 规则对齐，用于 UI 展示当前审核员可审级别 */
export function resolveReviewerLevelAccess(
  permissions: string[],
  levelMeta?: AuditPoolLevelCountResponse[],
): ReviewerLevelAccessSummary {
  if (hasUnrestrictedReviewLevels(permissions)) {
    const keys =
      levelMeta && levelMeta.length > 0
        ? levelMeta.map((level) => level.levelKey)
        : Object.keys(DEFAULT_LEVEL_LABELS);
    return {
      unrestricted: true,
      levels: keys.map((key) => ({
        key,
        label: labelForLevelKey(key, levelMeta),
      })),
    };
  }

  const keys = parseGrantedReviewLevelKeys(permissions);
  return {
    unrestricted: false,
    levels: keys.map((key) => ({
      key,
      label: labelForLevelKey(key, levelMeta),
    })),
  };
}

export function formatReviewerLevelAccessText(summary: ReviewerLevelAccessSummary): string {
  if (summary.levels.length === 0) {
    return "未配置审核级别权限";
  }
  if (summary.unrestricted) {
    return `全部级别（${summary.levels.map((level) => level.label).join("、")}）`;
  }
  return summary.levels.map((level) => level.label).join("、");
}
