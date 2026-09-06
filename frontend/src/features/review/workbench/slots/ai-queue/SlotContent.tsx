import { WorkbenchContentShell } from "@/components/workbench";
import { AiQueueEmptyState } from "../../../components/ai-queue/AiQueueEmptyState";
import { AiQueueSubmissionHeader } from "../../../components/ai-queue/sections/AiQueueSubmissionHeader";
import { AiQueueSlotFrame } from "../../AiQueueSlotFrame";
import { AiQueueSlotWidgetBoard } from "../../chrome/AiQueueSlotWidgetBoard";
import { AiQueueListPanelBody } from "../../panels/ai-queue/QueueListPanelBody";
import type { AiQueueSlotRenderEnv, AiQueueWorkbenchBusinessContext } from "../../types";

export function AiQueueQueueSlotContent({
  context,
  env,
}: {
  context: AiQueueWorkbenchBusinessContext;
  env: AiQueueSlotRenderEnv;
}) {
  return (
    <AiQueueSlotFrame
      slotId="queue"
      title="AI 审核队列"
      description="按状态筛选并选择预审条目。"
      env={env}
      controls={context}
    >
      <AiQueueListPanelBody context={context} />
    </AiQueueSlotFrame>
  );
}

export function AiQueueContentSlotContent({
  context,
  env,
}: {
  context: AiQueueWorkbenchBusinessContext;
  env: AiQueueSlotRenderEnv;
}) {
  if (!context.detail) {
    return (
      <AiQueueSlotFrame
        slotId="content"
        title="提交内容"
        description="题目导入数据与标注结果快照。"
        env={env}
        controls={context}
        flush
      >
        <AiQueueEmptyState />
      </AiQueueSlotFrame>
    );
  }

  return (
    <AiQueueSlotFrame
      slotId="content"
      title="提交内容"
      description="题目导入数据与标注结果快照。"
      env={env}
      controls={context}
      flush
    >
      <WorkbenchContentShell className="bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--muted)/0.88)_100%)]">
        <AiQueueSubmissionHeader detail={context.detail} />
        <AiQueueSlotWidgetBoard boardId="content" context={context} />
      </WorkbenchContentShell>
    </AiQueueSlotFrame>
  );
}

export function AiQueueInsightSlotContent({
  context,
  env,
}: {
  context: AiQueueWorkbenchBusinessContext;
  env: AiQueueSlotRenderEnv;
}) {
  if (!context.detail) {
    return (
      <AiQueueSlotFrame
        slotId="insight"
        title="AI 分析"
        description="AI 预审评分、维度分析与时间线。"
        env={env}
        controls={context}
        flush
      >
        <AiQueueEmptyState message="选择记录后查看 AI 分析" />
      </AiQueueSlotFrame>
    );
  }

  return (
    <AiQueueSlotFrame
      slotId="insight"
      title="AI 分析"
      description="AI 预审评分、维度分析与时间线。"
      env={env}
      controls={context}
      flush
    >
      <WorkbenchContentShell className="bg-muted/50">
        <div className="shrink-0 border-b border-border/80 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">AI 预审分析</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {context.detail.aiInsight.modelName} · {new Date(context.detail.aiInsight.analyzedAt).toLocaleString()}
          </p>
        </div>
        <AiQueueSlotWidgetBoard boardId="insight" context={context} />
      </WorkbenchContentShell>
    </AiQueueSlotFrame>
  );
}

export function AiQueueQueueCollapsedContent({ context }: { context: AiQueueWorkbenchBusinessContext }) {
  const filteredRows =
    context.statusFilter === "all"
      ? context.rows
      : context.rows.filter((row) => row.status === context.statusFilter);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-1 py-2 lh-workbench-rail-scroll">
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
            onClick={() => context.onSelectItem(row.id)}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}
