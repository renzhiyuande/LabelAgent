import { Badge } from "@/components/ui/badge";
import { AI_INSIGHT_STATUS_META } from "@/components/workbench";
import { ReviewSlotFrame } from "../../ReviewSlotFrame";
import { ReviewSlotWidgetBoard } from "../../chrome/ReviewSlotWidgetBoard";
import type { ReviewSlotRenderEnv, ReviewWorkbenchBusinessContext } from "../../types";

export function ReviewAiSlotContent({
  context,
  env,
}: {
  context: ReviewWorkbenchBusinessContext;
  env: ReviewSlotRenderEnv;
}) {
  return (
    <ReviewSlotFrame
      slotId="ai"
      title="AI 预审"
      description="AI 预检评分与维度分析参考。"
      env={env}
      controls={context}
      flush
    >
      <ReviewSlotWidgetBoard boardId="ai" context={context} />
    </ReviewSlotFrame>
  );
}

export function ReviewAiHeaderSlotContent({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const meta = AI_INSIGHT_STATUS_META[context.aiInsight.status];
  return (
    <div className="flex h-full items-center px-2">
      <Badge variant={meta.badge} className="h-7 px-2.5 text-xs font-normal">
        AI · {context.aiInsight.overallScore} 分 · {meta.label.replace("AI 建议：", "")}
      </Badge>
    </div>
  );
}

export function ReviewAiCollapsedContent({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const meta = AI_INSIGHT_STATUS_META[context.aiInsight.status];
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1 py-2">
      <Badge variant={meta.badge} className="px-1.5 py-0.5 text-[10px] font-normal">
        {meta.label}
      </Badge>
      <p className="text-lg font-semibold tabular-nums">{context.aiInsight.overallScore}</p>
    </div>
  );
}
