import { Send } from "lucide-react";
import type { LabelerWorkbenchBusinessContext } from "../types";

export function AnnotateCollapsedContent({ context }: { context: LabelerWorkbenchBusinessContext }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3">
      <Send className="h-5 w-5 text-emerald-500" />
      <span className="text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
        {context.annotateFieldCount}
      </span>
      {context.queueOrdinalLabel ? (
        <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">{context.queueOrdinalLabel}</span>
      ) : null}
    </div>
  );
}
