import { ArrowLeft, ArrowRight, Focus, LayoutPanelTop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LabelerWorkbenchBusinessContext } from "../types";

export function ToolbarCollapsedContent({ context }: { context: LabelerWorkbenchBusinessContext }) {
  return (
    <div className="lh-scrollbar-none flex h-full w-full min-h-0 flex-col items-center gap-2 overflow-y-auto py-2">
      <LayoutPanelTop className="h-5 w-5 shrink-0 text-primary" />
      {context.queueOrdinalLabel ? (
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
          {context.queueOrdinalLabel}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-xl"
        disabled={!context.canGoPrev}
        title="上一题"
        onClick={context.onPrevAssignment}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={context.focusMode ? "default" : "ghost"}
        size="icon"
        className="h-8 w-8 shrink-0 rounded-xl"
        title={context.focusMode ? "退出禅模式" : "禅模式"}
        onClick={context.onToggleFocusMode}
      >
        <Focus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-xl"
        disabled={!context.canGoNext}
        title="下一题"
        onClick={context.onNextAssignment}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
      {context.saving ? (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse")} title={context.saveHint || "保存中"} />
      ) : null}
    </div>
  );
}
