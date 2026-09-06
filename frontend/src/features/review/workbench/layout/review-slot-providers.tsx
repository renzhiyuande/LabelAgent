import { Bot, ClipboardList, FileSearch, History, LayoutPanelTop, ListOrdered, PenLine } from "lucide-react";
import type { NavigateFunction } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { AI_INSIGHT_STATUS_META } from "@/components/workbench";
import { WORKBENCH_WIDGET_HOST_SLOT_ID, type WorkbenchSlotProvider } from "@/components/workbench2";
import { TopCapsule } from "../chrome/TopCapsule";
import type { ReviewWorkbenchBusinessContext } from "../types";
import {
  ReviewAiCollapsedContent,
  ReviewAiHeaderSlotContent,
  ReviewAiSlotContent,
} from "../slots/review/AiSlotContent";
import { ReviewContentCollapsedContent, ReviewContentSlotContent } from "../slots/review/ContentSlotContent";
import {
  ReviewHistoryCollapsedContent,
  ReviewHistorySlotContent,
} from "../slots/review/HistorySlotContent";
import { ReviewQueueCollapsedContent, ReviewQueueSlotContent } from "../slots/review/QueueSlotContent";
import { ReviewFormCollapsedContent, ReviewFormSlotContent } from "../slots/review/ReviewFormSlotContent";
import { ReviewWidgetTabSlotContent } from "../slots/review/WidgetTabSlotContent";
import {
  ReviewWidgetRailContent,
  ReviewWidgetTabCapsule,
} from "../slots/review/ReviewWidgetRailContent";

interface CreateReviewSlotProvidersOptions {
  navigate: NavigateFunction;
}

function collapsedPresentation(env: { regionCollapsed: boolean; regionSize: number }) {
  if (!env.regionCollapsed) {
    return "default" as const;
  }
  return env.regionSize <= 64 ? ("collapsed" as const) : ("narrow" as const);
}

export function createReviewSlotProviders({
  navigate,
}: CreateReviewSlotProvidersOptions): WorkbenchSlotProvider<ReviewWorkbenchBusinessContext>[] {
  return [
    {
      id: "toolbar",
      label: "导航",
      icon: <LayoutPanelTop className="h-4 w-4" />,
      renderTopTab() {
        return <TopCapsule icon={<LayoutPanelTop className="h-4 w-4" />} label="导航" />;
      },
      render(context) {
        return (
          <div className="flex h-full items-center gap-2 px-2 text-xs text-slate-500">
            <button
              type="button"
              className="rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => navigate("/reviewer/audit-pool")}
            >
              人工审核池
            </button>
            <span className="truncate">{context.detail?.title ?? "人工审核工作台"}</span>
            {context.detail ? <Badge variant="secondary">{context.detail.submissionCode}</Badge> : null}
          </div>
        );
      },
    },
    {
      id: "ai-header",
      label: "AI",
      icon: <Bot className="h-4 w-4" />,
      renderTopTab(context) {
        const meta = AI_INSIGHT_STATUS_META[context.aiInsight.status];
        const score = context.detail?.hasRealAiReview ? context.aiInsight.overallScore : null;
        return (
          <TopCapsule
            icon={<Bot className="h-4 w-4" />}
            label="AI"
            badge={score != null ? (
              <Badge variant={meta.badge} className="h-5 px-1.5 text-[10px] font-normal">
                {score}
              </Badge>
            ) : undefined}
          />
        );
      },
      render(context) {
        return <ReviewAiHeaderSlotContent context={context} />;
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
        const queueCount =
          context.statusFilter === "all"
            ? context.rows.length
            : context.statusCounts[context.statusFilter] ??
              context.rows.filter((row) => row.status === context.statusFilter).length;
        return (
          <TopCapsule icon={<ListOrdered className="h-4 w-4" />} label="队列" badge={queueCount} />
        );
      },
      renderNarrow(context) {
        return <ReviewQueueCollapsedContent context={context} />;
      },
      renderCollapsed(context) {
        return <ReviewQueueCollapsedContent context={context} />;
      },
      render(context, env) {
        return <ReviewQueueSlotContent context={context} env={env} />;
      },
    },
    {
      id: "history",
      label: "历史",
      icon: <History className="h-4 w-4" />,
      getPresentation(_context, env) {
        return collapsedPresentation(env);
      },
      renderBodyTab() {
        return <TopCapsule icon={<History className="h-4 w-4" />} label="历史" />;
      },
      renderNarrow() {
        return <ReviewHistoryCollapsedContent />;
      },
      renderCollapsed() {
        return <ReviewHistoryCollapsedContent />;
      },
      render(context, env) {
        return <ReviewHistorySlotContent context={context} env={env} />;
      },
    },
    {
      id: "content",
      label: "题目",
      getPresentation(_context, env) {
        return collapsedPresentation(env);
      },
      renderBodyTab() {
        return <TopCapsule icon={<FileSearch className="h-4 w-4" />} label="题目" />;
      },
      renderNarrow(context) {
        return <ReviewContentCollapsedContent context={context} />;
      },
      renderCollapsed(context) {
        return <ReviewContentCollapsedContent context={context} />;
      },
      render(context, env) {
        return <ReviewContentSlotContent context={context} env={env} />;
      },
    },
    {
      id: "review",
      label: "审核",
      getPresentation(_context, env) {
        return collapsedPresentation(env);
      },
      renderBodyTab() {
        return <TopCapsule icon={<PenLine className="h-4 w-4" />} label="审核" />;
      },
      renderNarrow(context) {
        return <ReviewFormCollapsedContent context={context} />;
      },
      renderCollapsed(context) {
        return <ReviewFormCollapsedContent context={context} />;
      },
      render(context, env) {
        return <ReviewFormSlotContent context={context} env={env} />;
      },
    },
    {
      id: "ai",
      label: "AI",
      icon: <Bot className="h-4 w-4" />,
      getPresentation(_context, env) {
        return collapsedPresentation(env);
      },
      renderBodyTab(context) {
        const meta = AI_INSIGHT_STATUS_META[context.aiInsight.status];
        const score = context.detail?.hasRealAiReview ? context.aiInsight.overallScore : null;
        return (
          <TopCapsule
            icon={<Bot className="h-4 w-4" />}
            label="AI"
            badge={score != null ? (
              <Badge variant={meta.badge} className="h-5 px-1.5 text-[10px] font-normal">
                {score}
              </Badge>
            ) : undefined}
          />
        );
      },
      renderNarrow(context) {
        return <ReviewAiCollapsedContent context={context} />;
      },
      renderCollapsed(context) {
        return <ReviewAiCollapsedContent context={context} />;
      },
      render(context, env) {
        return <ReviewAiSlotContent context={context} env={env} />;
      },
    },
    {
      id: WORKBENCH_WIDGET_HOST_SLOT_ID,
      label: "组件",
      getPresentation(_context, env) {
        return collapsedPresentation(env);
      },
      renderBodyTab(context, env) {
        return <ReviewWidgetTabCapsule context={context} env={env} />;
      },
      renderNarrow(context, env) {
        return <ReviewWidgetRailContent context={context} env={env} presentation="narrow" />;
      },
      renderCollapsed(context, env) {
        return <ReviewWidgetRailContent context={context} env={env} presentation="collapsed" />;
      },
      render(context, env) {
        return <ReviewWidgetTabSlotContent context={context} env={env} />;
      },
    },
  ];
}
