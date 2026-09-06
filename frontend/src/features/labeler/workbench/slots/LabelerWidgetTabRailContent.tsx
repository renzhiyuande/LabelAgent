import { ClipboardCheck, FileText, Layers, PenLine, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseSectionWidgetId } from "../labeler-section-widget";
import { resolveLabelerWidgetDefinition } from "../labeler-widget-registry";
import { resolveReviewTabBadge } from "../layout/resolve-review-tab-badge";
import { resolveSubmissionStatusLabel, shouldShowReviewPanel } from "../utils/submission-review";
import { buildSectionWidgetRailSummary } from "../utils/section-widget-rail-summary";
import type { LabelerSlotRenderEnv, LabelerWorkbenchBusinessContext } from "../types";

function resolveTabWidgetId(context: LabelerWorkbenchBusinessContext, tabId: string): string | null {
  const tab = context.layoutTabs.find((item) => item.id === tabId);
  return tab?.widgetId ?? null;
}

function SectionRailBody({ summary }: { summary: ReturnType<typeof buildSectionWidgetRailSummary> }) {
  if (!summary) {
    return <p className="text-center text-[10px] text-slate-400">暂无内容</p>;
  }

  const Icon = summary.surface === "annotate" ? PenLine : FileText;

  return (
    <>
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <span
        className="max-w-[5rem] text-center text-[11px] font-semibold leading-4 text-slate-900 dark:text-slate-50"
        title={summary.title}
      >
        {summary.title}
      </span>
      {summary.progress ? (
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">已填</span>
          <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
            {summary.progress.filled}/{summary.progress.total}
          </span>
        </div>
      ) : null}
      {summary.lines.length > 0 ? (
        <div className="flex w-full max-w-[5.5rem] flex-col gap-1.5 border-t border-slate-200/70 pt-2 dark:border-slate-700">
          {summary.lines.map((line) => (
            <div key={`${line.label}:${line.value}`} className="text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{line.label}</p>
              <p
                className="mt-0.5 line-clamp-3 text-[10px] leading-4 text-slate-700 dark:text-slate-200"
                title={`${line.label}：${line.value}`}
              >
                {line.value}
              </p>
            </div>
          ))}
        </div>
      ) : summary.surface === "display" ? (
        <p className="text-center text-[10px] leading-4 text-slate-500 dark:text-slate-400">展开查看详情</p>
      ) : null}
    </>
  );
}

function StaticWidgetRailBody({
  widgetId,
  context,
}: {
  widgetId: string;
  context: LabelerWorkbenchBusinessContext;
}) {
  const title =
    resolveLabelerWidgetDefinition(widgetId, context.formSchema, context.renderPrefs)?.title ?? widgetId;

  switch (widgetId) {
    case "payload-main":
      return (
        <>
          <Sparkles className="h-5 w-5 shrink-0 text-violet-500" />
          <span className="max-w-[5rem] text-center text-[11px] font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </span>
          {context.queueOrdinalLabel ? (
            <span className="text-[10px] tabular-nums text-slate-500">{context.queueOrdinalLabel}</span>
          ) : null}
        </>
      );
    case "annotate-main":
      return (
        <>
          <Send className="h-5 w-5 shrink-0 text-emerald-500" />
          <span className="max-w-[5rem] text-center text-[11px] font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </span>
          <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            {context.annotateFieldCount}
          </span>
        </>
      );
    case "ai-review": {
      const statusLabel = shouldShowReviewPanel(context.work)
        ? resolveSubmissionStatusLabel(context.work.submission.currentStatus)
        : "待提交";
      return (
        <>
          <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" />
          {resolveReviewTabBadge(context)}
          <span className="max-w-[5rem] truncate text-center text-xs font-semibold text-slate-900 dark:text-slate-50" title={statusLabel}>
            {statusLabel}
          </span>
        </>
      );
    }
    case "annotate-actions":
      return (
        <>
          <Layers className="h-5 w-5 shrink-0 text-slate-500" />
          <span className="max-w-[5rem] text-center text-[11px] font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </span>
          <span className="max-w-[5rem] truncate text-center text-[10px] text-slate-500" title={context.saveHint}>
            {context.saveHint || "保存/提交"}
          </span>
        </>
      );
    default:
      return (
        <>
          <Layers className="h-5 w-5 shrink-0 text-slate-500" />
          <span className="max-w-[5rem] text-center text-[11px] font-semibold text-slate-900 dark:text-slate-50" title={title}>
            {title}
          </span>
        </>
      );
  }
}

export function LabelerWidgetTabRailContent({
  context,
  env,
}: {
  context: LabelerWorkbenchBusinessContext;
  env: LabelerSlotRenderEnv;
}) {
  const widgetId = resolveTabWidgetId(context, env.tabId);
  const sectionKey = widgetId ? parseSectionWidgetId(widgetId) : null;
  const summary = sectionKey ? buildSectionWidgetRailSummary(context, sectionKey) : null;

  return (
    <div
      className={cn(
        "lh-scrollbar-none flex h-full w-full min-h-0 flex-col items-center gap-2 overflow-y-auto px-1 py-3",
      )}
    >
      {sectionKey ? (
        <SectionRailBody summary={summary} />
      ) : widgetId ? (
        <StaticWidgetRailBody widgetId={widgetId} context={context} />
      ) : (
        <p className="text-center text-[10px] text-slate-400">未找到组件</p>
      )}
    </div>
  );
}
