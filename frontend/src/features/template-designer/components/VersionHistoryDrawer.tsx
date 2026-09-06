"use client";

import { useState } from "react";
import { CalendarClock, History, Rocket, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isVersionDraft, isVersionPublished } from "@/low-code/utils/form-schema";
import type { TemplateVersionItem } from "../types";
import {
  buildVersionImplTags,
  formatVersionTimestamp,
  getVersionStatusTone,
  marketStatusDisplayLabel,
  marketStatusTone,
  MARKET_STATUS_STYLES,
  versionStatusDisplayLabel,
  VERSION_STATUS_STYLES,
  type ActiveVersionSchemaMeta,
} from "../utils/version-history-utils";
import { SideSlidePanel } from "./SideSlidePanel";

interface VersionHistoryDrawerProps {
  open: boolean;
  versions: TemplateVersionItem[];
  activeSchema?: ActiveVersionSchemaMeta;
  onClose: () => void;
  onCreateVersion: () => void;
  onRollback: (versionId: string) => void;
  onSwitchVersion: (versionId: string) => void;
}

function VersionTag({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function VersionHistoryDrawer({
  open,
  versions,
  activeSchema,
  onClose,
  onCreateVersion,
  onRollback,
  onSwitchVersion,
}: VersionHistoryDrawerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <SideSlidePanel open={open} onClose={onClose} className="w-full max-w-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <History className="h-4 w-4 text-primary" />
          版本历史
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {versions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无版本记录</p>
        ) : (
          <ul className="space-y-3">
            {versions.map((version) => {
              const published = isVersionPublished(version.status);
              const draft = isVersionDraft(version.status);
              const selected = selectedId === version.id;
              const showActions = selected && !version.isCurrent;
              const tone = getVersionStatusTone(version.status);
              const styles = VERSION_STATUS_STYLES[tone];
              const marketTone = marketStatusTone(version.marketAuditStatus);
              const marketStyles = MARKET_STATUS_STYLES[marketTone];
              const implTags = buildVersionImplTags(version, activeSchema);
              const description = version.description.trim() || "暂无版本说明";

              return (
                <li key={version.id}>
                  <div
                    className={cn(
                      "flex min-h-[148px] gap-3 rounded-xl border border-l-4 px-3 py-3 transition",
                      styles.accent,
                      selected ? styles.selected : styles.card,
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 flex-col gap-2 text-left"
                      onClick={() => setSelectedId(selected ? null : version.id)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">
                          v{version.versionNo}
                        </span>
                        <VersionTag label={versionStatusDisplayLabel(version.status)} className={styles.badge} />
                        {version.isCurrent ? (
                          <VersionTag
                            label="当前"
                            className="bg-primary/10 text-primary ring-primary/25"
                          />
                        ) : null}
                      </div>

                      {version.templateName ? (
                        <p className="line-clamp-1 text-xs font-medium text-muted-foreground">
                          {version.templateName}
                        </p>
                      ) : null}

                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {description}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {implTags.map((tag) => (
                          <VersionTag key={tag.label} label={tag.label} className={tag.className} />
                        ))}
                      </div>

                      <div className="mt-auto space-y-1 pt-0.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <UserRound className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{version.author}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <CalendarClock className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span>创建 {formatVersionTimestamp(version.createdAt)}</span>
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-[11px]",
                            published && version.publishedAt
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          <Rocket className="h-3 w-3 shrink-0" />
                          <span>
                            {published && version.publishedAt
                              ? `发布 ${formatVersionTimestamp(version.publishedAt)}`
                              : "尚未发布"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="shrink-0 text-muted-foreground">模板市场</span>
                          <VersionTag
                            label={marketStatusDisplayLabel(version.marketAuditStatus)}
                            className={marketStyles}
                          />
                          {version.marketPublishedAt ? (
                            <span className="truncate">
                              {formatVersionTimestamp(version.marketPublishedAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>

                    <div className="flex w-[84px] shrink-0 items-center justify-end self-center">
                      {showActions && published ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-primary/30 px-2.5 text-xs text-primary hover:bg-primary/10"
                          onClick={() => onRollback(version.id)}
                        >
                          回滚
                        </Button>
                      ) : null}
                      {showActions && draft ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-primary/30 px-2.5 text-xs text-primary hover:bg-primary/10"
                          onClick={() => onSwitchVersion(version.id)}
                        >
                          切换
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-4">
        <Button type="button" className="w-full" onClick={onCreateVersion}>
          创建新版本
        </Button>
      </div>
    </SideSlidePanel>
  );
}
