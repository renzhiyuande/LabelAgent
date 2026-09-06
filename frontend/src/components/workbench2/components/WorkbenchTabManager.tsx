import { Pin, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WorkbenchRegionId, WorkbenchTabItem } from "../types";
import { isWidgetHostTab } from "../utils/widget-tab-operations";

const REGION_LABELS: Record<WorkbenchRegionId, string> = {
  top: "顶部",
  left: "左侧",
  center: "中间",
  right: "右侧",
};

interface WorkbenchTabManagerProps {
  tabs: WorkbenchTabItem[];
  onRenameTab: (tabId: string, label: string) => void;
  onRemoveTab: (tabId: string) => void;
  className?: string;
}

export function WorkbenchTabManager({ tabs, onRenameTab, onRemoveTab, className }: WorkbenchTabManagerProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  function startRename(tab: WorkbenchTabItem) {
    setEditingTabId(tab.id);
    setDraftLabel(tab.label);
  }

  function commitRename(tabId: string) {
    onRenameTab(tabId, draftLabel);
    setEditingTabId(null);
    setDraftLabel("");
  }

  const grouped = (["top", "left", "center", "right"] as WorkbenchRegionId[]).map((regionId) => ({
    regionId,
    tabs: tabs.filter((tab) => tab.regionId === regionId).sort((a, b) => a.index - b.index),
  }));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div>
        <p className="text-xs font-semibold text-foreground">Tab 管理</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">双击重命名；widget Tab 可删除</p>
      </div>

      {grouped.map(({ regionId, tabs: regionTabs }) =>
        regionTabs.length === 0 ? null : (
          <div key={regionId} className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {REGION_LABELS[regionId]}
            </p>
            {regionTabs.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/95 px-2 py-1.5"
              >
                {editingTabId === tab.id ? (
                  <Input
                    value={draftLabel}
                    autoFocus
                    className="h-7 flex-1 text-xs"
                    onChange={(event) => setDraftLabel(event.target.value)}
                    onBlur={() => commitRename(tab.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitRename(tab.id);
                      }
                      if (event.key === "Escape") {
                        setEditingTabId(null);
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground"
                    onDoubleClick={() => startRename(tab)}
                    title="双击重命名"
                  >
                    {tab.label}
                    {isWidgetHostTab(tab) ? (
                      <span className="ml-1 text-[10px] font-normal text-violet-500">· 组件</span>
                    ) : null}
                  </button>
                )}
                {tab.pinned ? <Pin className="h-3 w-3 shrink-0 text-amber-500" /> : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-red-500"
                  aria-label={`删除 ${tab.label}`}
                  disabled={!isWidgetHostTab(tab)}
                  title={isWidgetHostTab(tab) ? "删除 widget Tab" : "内置 Tab 不可删除"}
                  onClick={() => onRemoveTab(tab.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}
