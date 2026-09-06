import { isVersionDraft, isVersionPublished, versionStatusLabel } from "@/low-code/utils/form-schema";
import type { TemplateVersionItem } from "../types";

export type VersionStatusTone = "published" | "draft" | "unknown";
export type MarketStatusTone = "pending" | "approved" | "rejected" | "none";

export interface VersionImplTag {
  label: string;
  className: string;
}

export interface ActiveVersionSchemaMeta {
  versionId: string;
  fieldCount: number;
  sectionCount: number;
}

const TAG_PRIMARY = "bg-primary/10 text-primary ring-primary/25";
const TAG_MUTED = "bg-muted text-muted-foreground ring-border";

export const MARKET_STATUS_STYLES: Record<MarketStatusTone, string> = {
  pending: TAG_PRIMARY,
  approved: "bg-primary/15 text-primary ring-primary/30",
  rejected: "bg-destructive/10 text-destructive ring-destructive/25",
  none: TAG_MUTED,
};

export function formatVersionTimestamp(value: number | undefined): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getVersionStatusTone(status: string | undefined): VersionStatusTone {
  if (isVersionPublished(status)) {
    return "published";
  }
  if (isVersionDraft(status)) {
    return "draft";
  }
  return "unknown";
}

export const VERSION_STATUS_STYLES: Record<
  VersionStatusTone,
  { badge: string; accent: string; card: string; selected: string }
> = {
  published: {
    badge: TAG_PRIMARY,
    accent: "border-l-primary",
    card: "border-border/80 bg-primary/5",
    selected: "border-primary/40 bg-primary/10 ring-1 ring-primary/30",
  },
  draft: {
    badge: "bg-primary/15 text-primary ring-primary/30",
    accent: "border-l-primary/70",
    card: "border-border/80 bg-muted/50",
    selected: "border-primary/50 bg-primary/10 ring-1 ring-primary/25",
  },
  unknown: {
    badge: TAG_MUTED,
    accent: "border-l-border",
    card: "border-border bg-card",
    selected: "border-primary/40 bg-primary/10 ring-1 ring-primary/30",
  },
};

export function buildVersionImplTags(
  version: TemplateVersionItem,
  activeSchema?: ActiveVersionSchemaMeta,
): VersionImplTag[] {
  const tags: VersionImplTag[] = [
    {
      label: "表单模板",
      className: TAG_MUTED,
    },
  ];

  if (isVersionPublished(version.status)) {
    tags.push({
      label: "已发布",
      className: TAG_PRIMARY,
    });
  } else if (isVersionDraft(version.status)) {
    tags.push({
      label: "可编辑",
      className: "bg-primary/15 text-primary ring-primary/30",
    });
  }

  if (version.isCurrent) {
    tags.push({
      label: "使用中",
      className: TAG_PRIMARY,
    });
  }

  if (activeSchema && activeSchema.versionId === version.id) {
    tags.push({
      label: `${activeSchema.fieldCount} 字段`,
      className: "bg-muted text-foreground ring-border",
    });
    tags.push({
      label: `${activeSchema.sectionCount} 分组`,
      className: "bg-muted text-foreground ring-border",
    });
  }

  return tags;
}

export function versionStatusDisplayLabel(status: string | undefined): string {
  return versionStatusLabel(status);
}

export function marketStatusTone(status: string | undefined): MarketStatusTone {
  switch (status) {
    case "PENDING":
      return "pending";
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    default:
      return "none";
  }
}

export function marketStatusDisplayLabel(status: string | undefined): string {
  switch (status) {
    case "PENDING":
      return "待审核";
    case "APPROVED":
      return "已通过审核";
    case "REJECTED":
      return "市场发布被拒";
    default:
      return "未发布到市场";
  }
}
