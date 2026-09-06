import { StatusFilterTabs } from "@/components/workbench/shared/StatusFilterTabs";
import type { AuditPoolLevelCountResponse } from "../api/reviewer-workbench-api";

export interface AuditPoolReviewLevelTabsProps {
  levels: AuditPoolLevelCountResponse[];
  activeLevelKey: string;
  loading?: boolean;
  onLevelChange: (levelKey: string) => void;
}

export function AuditPoolReviewLevelTabs({
  levels,
  activeLevelKey,
  loading,
  onLevelChange,
}: AuditPoolReviewLevelTabsProps) {
  if (levels.length <= 1) {
    return null;
  }

  const tabs = levels.map((level) => ({
    id: level.levelKey,
    label: level.levelLabel,
    count: level.pendingCount,
  }));

  return (
    <div className={loading ? "pointer-events-none opacity-60" : undefined}>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">审核级别</p>
      <StatusFilterTabs tabs={tabs} activeTabId={activeLevelKey} onTabChange={onLevelChange} />
    </div>
  );
}
