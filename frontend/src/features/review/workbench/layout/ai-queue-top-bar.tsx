import { Focus, RefreshCw, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import type { WorkbenchTopBarRenderParams } from "@/components/workbench2";
import { LabelerSettingsPopoverShell } from "@/features/labeler/workbench/chrome/labeler-settings-popover-shell";
import { QueueNavControls } from "../chrome/QueueNavControls";
import { ReviewWorkbenchSettingsPanel } from "../chrome/ReviewWorkbenchSettingsPanel";
import type { AiQueueWorkbenchBusinessContext } from "../types";

interface CreateAiQueueTopBarOptions {
  onToggleEditMode: () => void;
  onResetWorkbench: () => void;
}

export function createAiQueueTopBar({ onToggleEditMode, onResetWorkbench }: CreateAiQueueTopBarOptions) {
  return function renderTopBar({
    label,
    tabContainer,
    editing,
    businessContext,
  }: WorkbenchTopBarRenderParams<AiQueueWorkbenchBusinessContext>) {
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-2xl bg-violet-50 p-2 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {businessContext.detail?.ruleName ?? label}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              审核与质检 / AI 预审规则 · 队列
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
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-full px-3" onClick={businessContext.onRetryFailed}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            失败重跑
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
                layoutHint="三栏布局：左队列 · 中内容 · 右 AI 分析"
              />
            </LabelerSettingsPopoverShell>
          </Popover>
        </div>
      </div>
    );
  };
}
