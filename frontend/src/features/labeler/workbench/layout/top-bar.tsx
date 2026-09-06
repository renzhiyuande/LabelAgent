import { ArrowLeft, ArrowRight, Focus, LayoutPanelTop, Settings2 } from "lucide-react";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { WorkbenchTopBarRenderParams } from "@/components/workbench2";
import { LabelerSettingsPopoverShell } from "../chrome/labeler-settings-popover-shell";
import { LabelerWorkbenchSettingsPanel } from "../chrome/LabelerWorkbenchSettingsPanel";
import type { LabelerWorkbenchBusinessContext } from "../types";

interface CreateTopBarOptions {
  onToggleEditMode: () => void;
  onResetWorkbench: () => void;
}

export function createLabelerTopBar({ onToggleEditMode, onResetWorkbench }: CreateTopBarOptions) {
  return function renderTopBar({
    label,
    tabContainer,
    businessContext,
  }: WorkbenchTopBarRenderParams<LabelerWorkbenchBusinessContext>) {
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-2xl bg-primary/10 p-2 text-primary">
            <LayoutPanelTop className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{businessContext.work.task.taskName ?? label}</div>
            <div className="text-xs text-muted-foreground">
              模板 v{businessContext.work.templateVersion.versionNo ?? "—"} · 提交 {businessContext.work.submission.currentStatus}
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="min-w-0 flex-1">
            <div className="mx-auto max-w-[520px]">{tabContainer}</div>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-muted/90 p-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={!businessContext.canGoPrev} onClick={businessContext.onPrevAssignment}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {businessContext.queueOrdinalLabel ? (
              <span className="rounded-full bg-card/90 px-2 py-1 text-xs font-semibold tabular-nums text-foreground">
                题 {businessContext.queueOrdinalLabel}
              </span>
            ) : null}
            {businessContext.queuePositionLabel ? (
              <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">{businessContext.queuePositionLabel}</span>
            ) : null}
            <Button type="button" variant={businessContext.focusMode ? "default" : "ghost"} size="sm" className="h-8 rounded-full px-3" onClick={businessContext.onToggleFocusMode}>
              <Focus className="mr-1.5 h-4 w-4" />
              禅模式
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={!businessContext.canGoNext} onClick={businessContext.onNextAssignment}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {/* <Button type="button" variant={editing ? "default" : "outline"} size="sm" className="h-9 rounded-full px-3" onClick={onToggleEditMode}>
            <PenSquare className="mr-1.5 h-4 w-4" />
            {editing ? "完成编辑" : "编辑布局"}
          </Button> */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9 rounded-full px-3">
                <Settings2 className="mr-1.5 h-4 w-4" />
                设置
              </Button>
            </PopoverTrigger>
            <LabelerSettingsPopoverShell>
              <LabelerWorkbenchSettingsPanel
                context={businessContext}
                onToggleEditMode={onToggleEditMode}
                onResetWorkbench={onResetWorkbench}
              />
            </LabelerSettingsPopoverShell>
          </Popover>
        </div>
      </div>
    );
  };
}
