import { Bot, ClipboardList, FileText, Sparkles } from "lucide-react";
import type { NavigateFunction } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { WORKBENCH_WIDGET_HOST_SLOT_ID, type WorkbenchSlotProvider } from "@/components/workbench2";
import { AiQueueWidgetTabSlotContent } from "../slots/ai-queue/WidgetTabSlotContent";
import { TopCapsule } from "../chrome/TopCapsule";
import type { AiQueueWorkbenchBusinessContext } from "../types";
import {
  AiQueueContentSlotContent,
  AiQueueInsightSlotContent,
  AiQueueQueueCollapsedContent,
  AiQueueQueueSlotContent,
} from "../slots/ai-queue/SlotContent";

interface CreateAiQueueSlotProvidersOptions {
  navigate: NavigateFunction;
}

function collapsedPresentation(env: { regionCollapsed: boolean; regionSize: number }) {
  if (!env.regionCollapsed) {
    return "default" as const;
  }
  return env.regionSize <= 64 ? ("collapsed" as const) : ("narrow" as const);
}

export function createAiQueueSlotProviders({
  navigate,
}: CreateAiQueueSlotProvidersOptions): WorkbenchSlotProvider<AiQueueWorkbenchBusinessContext>[] {
  return [
    {
      id: "toolbar",
      label: "导航",
      renderTopTab() {
        return <TopCapsule icon={<Sparkles className="h-4 w-4" />} label="导航" />;
      },
      render(context) {
        return (
          <div className="flex h-full items-center gap-2 px-2 text-xs text-muted-foreground">
            <button
              type="button"
              className="rounded-lg px-2 py-1 hover:bg-muted"
              onClick={() => navigate("/reviewer/ai-queue")}
            >
              AI 审核队列
            </button>
            <span className="truncate">{context.detail?.ruleName ?? "AI 自动预审队列"}</span>
            {context.detail ? <Badge variant="secondary">{context.detail.agentVersion}</Badge> : null}
          </div>
        );
      },
    },
    {
      id: "queue",
      label: "队列",
      icon: <ClipboardList className="h-4 w-4" />,
      getPresentation(_context, env) {
        return collapsedPresentation(env);
      },
      renderBodyTab(context) {
        const count =
          context.statusFilter === "all"
            ? context.rows.length
            : context.rows.filter((row) => row.status === context.statusFilter).length;
        return <TopCapsule icon={<ClipboardList className="h-4 w-4" />} label="队列" badge={count} />;
      },
      renderNarrow(context) {
        return <AiQueueQueueCollapsedContent context={context} />;
      },
      renderCollapsed(context) {
        return <AiQueueQueueCollapsedContent context={context} />;
      },
      render(context, env) {
        return <AiQueueQueueSlotContent context={context} env={env} />;
      },
    },
    {
      id: "content",
      label: "内容",
      renderBodyTab() {
        return <TopCapsule icon={<FileText className="h-4 w-4" />} label="内容" />;
      },
      render(context, env) {
        return <AiQueueContentSlotContent context={context} env={env} />;
      },
    },
    {
      id: "insight",
      label: "AI 分析",
      icon: <Bot className="h-4 w-4" />,
      getPresentation(_context, env) {
        return collapsedPresentation(env);
      },
      renderBodyTab(context) {
        const score = context.detail?.hasRealAiReview ? context.detail.aiInsight.overallScore : undefined;
        return (
          <TopCapsule
            icon={<Bot className="h-4 w-4" />}
            label="AI 分析"
            badge={score != null ? score : undefined}
          />
        );
      },
      renderNarrow(context) {
        const score = context.detail?.hasRealAiReview ? context.detail.aiInsight.overallScore : undefined;
        return (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            {score != null ? <span className="text-sm font-semibold tabular-nums">{score}</span> : null}
          </div>
        );
      },
      renderCollapsed(context) {
        const score = context.detail?.hasRealAiReview ? context.detail.aiInsight.overallScore : undefined;
        return (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            {score != null ? <span className="text-sm font-semibold tabular-nums">{score}</span> : null}
          </div>
        );
      },
      render(context, env) {
        return <AiQueueInsightSlotContent context={context} env={env} />;
      },
    },
    {
      id: WORKBENCH_WIDGET_HOST_SLOT_ID,
      label: "组件",
      render(context, env) {
        return <AiQueueWidgetTabSlotContent context={context} env={env} />;
      },
    },
  ];
}
