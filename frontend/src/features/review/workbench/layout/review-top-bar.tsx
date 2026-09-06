import { Focus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import type { WorkbenchTopBarRenderParams } from "@/components/workbench2";
import { LabelerSettingsPopoverShell } from "@/features/labeler/workbench/chrome/labeler-settings-popover-shell";
import { QueueNavControls } from "../chrome/QueueNavControls";
import { ReviewWorkbenchSettingsPanel } from "../chrome/ReviewWorkbenchSettingsPanel";
import type { ReviewWorkbenchBusinessContext } from "../types";

interface CreateReviewTopBarOptions {
  onToggleEditMode: () => void;
  onResetWorkbench: () => void;
}

export function createReviewTopBar({ onToggleEditMode, onResetWorkbench }: CreateReviewTopBarOptions) {
  return function renderTopBar({
    label,
    tabContainer,
    editing,
    businessContext,
  }: WorkbenchTopBarRenderParams<ReviewWorkbenchBusinessContext>) {
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-2xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <Settings2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {businessContext.detail?.title ?? label}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              题目只读 · 标注结果只读 · 右侧审核表单
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="min-w-0 flex-1">
            <div className="mx-auto max-w-[520px]">{tabContainer}</div>
          </div>
          <QueueNavControls
            canGoPrev={businessContext.canGoPrev}
            canGoNext={businessContext.canGoNext}
            queuePositionLabel={businessContext.queuePositionLabel}
            onPrev={businessContext.onPrev}
            onNext={businessContext.onNext}
          />
          <Button
            type="button"
            variant={businessContext.focusMode ? "default" : "outline"}
            size="sm"
            className="h-9 rounded-full px-3"
            onClick={businessContext.onToggleFocusMode}
          >
            <Focus className="mr-1.5 h-4 w-4" />
            {businessContext.focusMode ? "退出禅模式" : "禅模式"}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9 rounded-full px-3">
                <Settings2 className="mr-1.5 h-4 w-4" />
                设置
              </Button>
            </PopoverTrigger>
            <LabelerSettingsPopoverShell>
              <ReviewWorkbenchSettingsPanel
                editMode={editing}
                renderPrefs={businessContext.renderPrefs}
                onToggleEditMode={onToggleEditMode}
                onResetWorkbench={onResetWorkbench}
                onRenderPrefsChange={businessContext.setRenderPrefs}
                onResetRenderPrefs={businessContext.resetRenderPrefs}
                onApplyDefaultViews={businessContext.applyRenderDefaultViews}
              />
            </LabelerSettingsPopoverShell>
          </Popover>
        </div>
      </div>
    );
  };
}
