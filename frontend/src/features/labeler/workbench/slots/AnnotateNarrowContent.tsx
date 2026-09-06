import { Send } from "lucide-react";
import type { LabelerWorkbenchBusinessContext } from "../types";

export function AnnotateNarrowContent({ context }: { context: LabelerWorkbenchBusinessContext }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <Send className="h-5 w-5 text-emerald-500" />
      <span className="text-[11px] text-slate-500">{context.annotateFieldCount}</span>
    </div>
  );
}
