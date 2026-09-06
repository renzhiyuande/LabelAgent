import type { ResourceRecord } from "@/low-code/types";
import type { ResourcePageSummarySchema } from "@/low-code/schema/types";
import { getResourceInsightSnapshot } from "./resource-page-insights";
import { ResourcePageInsightsInlineSummary } from "./ResourcePageInsightsInlineSummary";
import { ResourcePageInsightsRailSummary } from "./ResourcePageInsightsRailSummary";
import { ResourcePageInsightsStripSummary } from "./ResourcePageInsightsStripSummary";

interface ResourcePageInsightsPanelProps {
  resourceKey: string;
  summary: ResourcePageSummarySchema;
  records: ResourceRecord[];
  loading?: boolean;
  refreshing?: boolean;
}

const toneClassName: Record<string, string> = {
  default: "border-border/70 bg-background/78 hover:border-primary/30",
  success: "border-primary/20 bg-primary/5 hover:border-primary/35",
  warning: "border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40",
  destructive: "border-destructive/30 bg-destructive/5 hover:border-destructive/45",
};

export function ResourcePageInsightsPanel({
  resourceKey,
  summary,
  records,
  loading = false,
  refreshing = false,
}: ResourcePageInsightsPanelProps) {
  const snapshot = getResourceInsightSnapshot(resourceKey, records);

  if (!snapshot) {
    return null;
  }

  const commonProps = {
    summary,
    snapshot,
    loading,
    refreshing,
    hasRecords: records.length > 0,
    toneClassName,
  };

  if (summary.variant === "inline") {
    return <ResourcePageInsightsInlineSummary {...commonProps} />;
  }

  if (summary.variant === "strip") {
    return <ResourcePageInsightsStripSummary {...commonProps} />;
  }

  return <ResourcePageInsightsRailSummary {...commonProps} />;
}
