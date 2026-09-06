import { AI_INSIGHT_STATUS_META, AiInsightPanel } from "@/components/workbench";
import type { ReviewWorkbenchBusinessContext } from "../../types";

export function AiInsightPanelBody({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const meta = AI_INSIGHT_STATUS_META[context.aiInsight.status];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-800">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">AI 预审参考</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          综合 {context.aiInsight.overallScore} 分 · {meta.label}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <AiInsightPanel insight={context.aiInsight} title="AI 预审参考" />
      </div>
    </div>
  );
}
