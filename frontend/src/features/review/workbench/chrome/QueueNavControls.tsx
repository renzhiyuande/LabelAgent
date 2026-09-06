import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueueNavControlsProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  queuePositionLabel: string | null;
  onPrev?: () => void;
  onNext?: () => void;
}

export function QueueNavControls({
  canGoPrev,
  canGoNext,
  queuePositionLabel,
  onPrev,
  onNext,
}: QueueNavControlsProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/80 p-0.5">
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={!canGoPrev} onClick={() => onPrev?.()}>
        <ChevronLeft className="mr-0.5 h-4 w-4" />
        上一条
      </Button>
      {queuePositionLabel ? (
        <span className="min-w-[3rem] px-1 text-center text-xs tabular-nums text-muted-foreground">{queuePositionLabel}</span>
      ) : null}
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={!canGoNext} onClick={() => onNext?.()}>
        下一条
        <ChevronRight className="ml-0.5 h-4 w-4" />
      </Button>
    </div>
  );
}
