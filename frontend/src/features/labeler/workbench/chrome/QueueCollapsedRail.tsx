import { ClipboardList } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLabelerWorkSessionStore } from "../../work/stores/labeler-work-session";
import {
  formatQueueRowSeqNo,
  queueRowStatusLabel,
  queueRowStatusShortLabel,
  queueRowStatusTextClass,
  queueRowStatusTone,
  resolveQueueRowSeqNo,
} from "../../work/utils/queue-row-display";
import type { LabelerWorkbenchBusinessContext } from "../types";

export function QueueCollapsedRail({ context }: { context: LabelerWorkbenchBusinessContext }) {
  const works = useLabelerWorkSessionStore((state) => state.works);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="lh-scrollbar-none flex h-full w-full min-h-0 flex-col items-center gap-2 overflow-y-auto py-2">
        <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
        {context.queueRows.map((row, index) => {
          const active = String(row.assignmentId) === context.assignmentId;
          const cachedWork = works[String(row.assignmentId)];
          const seqNo = resolveQueueRowSeqNo(row, index, cachedWork);
          const seqLabel = formatQueueRowSeqNo(seqNo);
          const statusShort = queueRowStatusShortLabel(row);
          const statusFull = queueRowStatusLabel(row);
          const statusTone = queueRowStatusTone(row);
          const tooltipText = `第 ${seqNo} 题 · ${statusFull}`;
          const queueLocked = context.contentPendingOnly;

          return (
            <Tooltip key={row.assignmentId}>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0">
                  <button
                    type="button"
                    disabled={queueLocked}
                    className={cn(
                      "flex h-[52px] w-11 flex-col items-center justify-center gap-0.5 px-0.5 transition-colors",
                      queueLocked && "pointer-events-none opacity-60",
                      active
                        ? "bg-primary/10"
                        : "hover:bg-muted",
                    )}
                    onClick={() => context.onSelectAssignment(String(row.assignmentId))}
                  >
                    <span
                      className={cn(
                        "text-[11px] font-bold leading-none tabular-nums",
                        active ? "text-primary" : "text-foreground",
                      )}
                    >
                      {seqLabel}
                    </span>
                    <span
                      className={cn(
                        "max-w-full truncate px-0.5 text-[9px] font-medium leading-none",
                        queueRowStatusTextClass(statusTone),
                      )}
                    >
                      {statusShort}
                    </span>
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="max-w-[220px] text-center">
                {tooltipText}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
