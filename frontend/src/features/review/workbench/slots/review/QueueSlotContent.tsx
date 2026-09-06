import { ReviewSlotFrame } from "../../ReviewSlotFrame";
import { QueueListPanelBody } from "../../panels/review/QueueListPanelBody";
import type { ReviewSlotRenderEnv, ReviewWorkbenchBusinessContext } from "../../types";

export function ReviewQueueSlotContent({
  context,
  env,
}: {
  context: ReviewWorkbenchBusinessContext;
  env: ReviewSlotRenderEnv;
}) {
  return (
    <ReviewSlotFrame
      slotId="queue"
      title="待审队列"
      description="扁平队列连续审核；点击「任务视图」侧拉按任务/标注员/题目聚合定位。"
      env={env}
      controls={context}
      flush
    >
      <QueueListPanelBody context={context} />
    </ReviewSlotFrame>
  );
}

export function ReviewQueueCollapsedContent({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const filteredRows =
    context.statusFilter === "all"
      ? context.rows
      : context.rows.filter((row) => row.status === context.statusFilter);
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-1 py-2 lh-workbench-rail-scroll">
      {filteredRows.map((row, index) => {
        const active = row.id === context.currentId;
        return (
          <button
            key={row.id}
            type="button"
            title={row.title}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-medium tabular-nums ${
              active
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => context.onSelectReview(row.id)}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}
