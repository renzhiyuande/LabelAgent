import { Bot, Clock3, FileSearch, GitCompare, PenLine, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AI_INSIGHT_STATUS_META } from "@/components/workbench";
import { AuditTimeline } from "@/components/workbench/shared/AuditTimeline";
import { flattenSubmitDataDiff } from "@/components/workbench/shared/flatten-submit-data-diff";
import {
  REVIEW_WIDGET_DEFINITIONS,
  isReviewWidgetId,
  type ReviewWorkbenchWidgetId,
} from "../../review-widget-registry";
import { TopCapsule } from "../../chrome/TopCapsule";
import type { ReviewSlotRenderEnv, ReviewWorkbenchBusinessContext } from "../../types";

const WIDGET_TAB_SHORT_LABEL: Partial<Record<ReviewWorkbenchWidgetId, string>> = {
  "content-header": "标题",
  "content-payload": "上下文",
  "content-annotate-diff": "差异",
  "content-annotate": "标注",
  "content-annotate-timeline": "时间线",
  "review-header": "审核",
  "review-comment": "意见",
  "review-actions": "操作",
  "ai-dimensions": "维度",
  "ai-verdict": "结论",
  "ai-prompt": "Prompt",
  "ai-raw-response": "原始",
};

export function resolveReviewWidgetIdFromTab(
  context: ReviewWorkbenchBusinessContext,
  env: ReviewSlotRenderEnv,
): ReviewWorkbenchWidgetId | null {
  const tab = context.layoutTabs.find((item) => item.id === env.tabId);
  if (!tab?.widgetId || !isReviewWidgetId(tab.widgetId)) {
    return null;
  }
  return tab.widgetId;
}

function widgetIcon(widgetId: ReviewWorkbenchWidgetId) {
  switch (widgetId) {
    case "content-annotate-timeline":
      return Clock3;
    case "content-annotate-diff":
      return GitCompare;
    case "content-payload":
    case "content-annotate":
      return FileSearch;
    case "review-comment":
    case "review-actions":
    case "review-header":
      return PenLine;
    case "ai-dimensions":
    case "ai-verdict":
    case "ai-prompt":
    case "ai-raw-response":
      return Bot;
    default:
      return Sparkles;
  }
}

export function ReviewWidgetTabCapsule({
  context,
  env,
}: {
  context: ReviewWorkbenchBusinessContext;
  env: ReviewSlotRenderEnv;
}) {
  const widgetId = resolveReviewWidgetIdFromTab(context, env);
  if (!widgetId) {
    return null;
  }
  const Icon = widgetIcon(widgetId);
  const title = REVIEW_WIDGET_DEFINITIONS[widgetId].title;
  const shortLabel = WIDGET_TAB_SHORT_LABEL[widgetId] ?? title;
  let badge: number | undefined;

  if (widgetId === "content-annotate-timeline") {
    const count = context.detail?.timeline.length ?? 0;
    badge = count > 0 ? count : undefined;
  } else if (widgetId === "content-annotate-diff" && context.detail) {
    badge = flattenSubmitDataDiff(context.detail.previousSubmitData, context.detail.annotateData).length || undefined;
  } else if (widgetId === "ai-dimensions" || widgetId === "ai-verdict") {
    badge = context.aiInsight.overallScore;
  }

  return (
    <TopCapsule
      icon={<Icon className="h-4 w-4" />}
      label={shortLabel}
      badge={badge}
      title={title}
    />
  );
}

export function ReviewWidgetRailContent({
  context,
  env,
  presentation,
}: {
  context: ReviewWorkbenchBusinessContext;
  env: ReviewSlotRenderEnv;
  presentation: "narrow" | "collapsed";
}) {
  const widgetId = resolveReviewWidgetIdFromTab(context, env);
  if (!widgetId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1 py-2 text-[10px] text-slate-400">
        组件
      </div>
    );
  }

  const Icon = widgetIcon(widgetId);
  const title = REVIEW_WIDGET_DEFINITIONS[widgetId].title;

  if (widgetId === "content-annotate-timeline" && context.detail?.timeline.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-hidden px-1 py-2">
        <Clock3 className="h-4 w-4 shrink-0 text-slate-400" />
        <AuditTimeline entries={context.detail.timeline} variant="rail" className="min-h-0 flex-1" />
      </div>
    );
  }

  if (widgetId === "content-annotate-diff" && context.detail) {
    const diffCount = flattenSubmitDataDiff(context.detail.previousSubmitData, context.detail.annotateData).length;
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1 py-2 lh-workbench-rail-scroll">
        <GitCompare className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-300">{diffCount}</span>
        <span className="text-[10px] text-slate-500">处差异</span>
      </div>
    );
  }

  if (widgetId === "ai-verdict" || widgetId === "ai-dimensions") {
    const meta = AI_INSIGHT_STATUS_META[context.aiInsight.status];
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1 py-2 lh-workbench-rail-scroll">
        <Badge variant={meta.badge} className="px-1.5 py-0.5 text-[10px] font-normal">
          {presentation === "collapsed" ? meta.label.slice(0, 2) : meta.label}
        </Badge>
        <p className="text-lg font-semibold tabular-nums">{context.aiInsight.overallScore}</p>
      </div>
    );
  }

  const initial = title.slice(0, 1);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1 py-2 lh-workbench-rail-scroll">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        title={title}
      >
        {initial}
      </span>
      {presentation === "narrow" ? (
        <span className="max-w-[4.5rem] truncate text-[10px] text-slate-500">{title}</span>
      ) : null}
    </div>
  );
}
