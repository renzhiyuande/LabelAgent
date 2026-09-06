import { History } from "lucide-react";
import { ReviewSlotFrame } from "../../ReviewSlotFrame";
import { HistoryListPanelBody } from "../../panels/review/HistoryListPanelBody";
import type { ReviewSlotRenderEnv, ReviewWorkbenchBusinessContext } from "../../types";

export function ReviewHistorySlotContent({
  context,
  env,
}: {
  context: ReviewWorkbenchBusinessContext;
  env: ReviewSlotRenderEnv;
}) {
  return (
    <ReviewSlotFrame
      slotId="history"
      title="审核历史"
      description="上一轮审核意见与历史记录。"
      env={env}
      controls={context}
      flush
    >
      <HistoryListPanelBody context={context} />
    </ReviewSlotFrame>
  );
}

export function ReviewHistoryCollapsedContent() {
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center px-1 py-2">
      <History className="h-4 w-4 text-slate-400" />
      <span className="mt-1 text-[10px] text-slate-500">历史</span>
    </div>
  );
}
