import { FileSearch } from "lucide-react";
import { WorkbenchContentShell } from "@/components/workbench";
import { ReviewSlotFrame } from "../../ReviewSlotFrame";
import { ReviewSlotWidgetBoard } from "../../chrome/ReviewSlotWidgetBoard";
import type { ReviewSlotRenderEnv, ReviewWorkbenchBusinessContext } from "../../types";
import { ContentBodyPanelBody } from "../../panels/review/ContentBodyPanelBody";

export function ReviewContentSlotContent({
  context,
  env,
}: {
  context: ReviewWorkbenchBusinessContext;
  env: ReviewSlotRenderEnv;
}) {
  if (!context.detail) {
    return <ContentBodyPanelBody context={context} />;
  }

  return (
    <ReviewSlotFrame
      slotId="content"
      title="题目与标注"
      description="题目 payload 与标注结果只读展示。"
      env={env}
      controls={context}
      flush
    >
      <WorkbenchContentShell className="bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--muted)/0.88)_100%)]">
        <ReviewSlotWidgetBoard boardId="content" context={context} />
      </WorkbenchContentShell>
    </ReviewSlotFrame>
  );
}

export function ReviewContentCollapsedContent({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const title = context.detail?.title?.trim();
  const initial = title ? title.slice(0, 1) : "题";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1 py-2 lh-workbench-rail-scroll">
      <FileSearch className="h-4 w-4 shrink-0 text-slate-400" />
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        title={title ?? "题目"}
      >
        {initial}
      </span>
    </div>
  );
}
