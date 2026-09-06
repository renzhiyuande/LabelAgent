import { ClipboardCheck, ClipboardList, LayoutPanelTop, Send, Sparkles } from "lucide-react";
import type { NavigateFunction } from "react-router-dom";
import { WORKBENCH_WIDGET_HOST_SLOT_ID, type WorkbenchSlotProvider } from "@/components/workbench2";
import { resolveLabelerWidgetDefinition } from "../labeler-widget-registry";
import type { LabelerWorkbenchBusinessContext } from "../types";
import { TopCapsule } from "../chrome/TopCapsule";
import { resolveReviewTabBadge } from "./resolve-review-tab-badge";
import { AiCollapsedContent } from "../slots/AiCollapsedContent";
import { AiNarrowContent } from "../slots/AiNarrowContent";
import { AiSlotContent } from "../slots/AiSlotContent";
import { AnnotateCollapsedContent } from "../slots/AnnotateCollapsedContent";
import { AnnotateNarrowContent } from "../slots/AnnotateNarrowContent";
import { AnnotateSlotContent } from "../slots/AnnotateSlotContent";
import { PayloadSlotContent } from "../slots/PayloadSlotContent";
import { QueueCollapsedContent } from "../slots/QueueCollapsedContent";
import { QueueSlotContent } from "../slots/QueueSlotContent";
import { SummaryCollapsedContent } from "../slots/SummaryCollapsedContent";
import { SummaryPopoverContent } from "../slots/SummaryPopoverContent";
import { SummarySlotContent } from "../slots/SummarySlotContent";
import { ToolbarCollapsedContent } from "../slots/ToolbarCollapsedContent";
import { ToolbarPopoverContent } from "../slots/ToolbarPopoverContent";
import { ToolbarSlotContent } from "../slots/ToolbarSlotContent";
import { LabelerWidgetTabRailContent } from "../slots/LabelerWidgetTabRailContent";
import { LabelerWidgetTabSlotContent } from "../slots/LabelerWidgetTabSlotContent";

interface CreateSlotProvidersOptions {
  navigate: NavigateFunction;
  onToggleEditMode: () => void;
  onResetWorkbench: () => void;
}

export function createLabelerSlotProviders({
  navigate,
  onToggleEditMode,
  onResetWorkbench,
}: CreateSlotProvidersOptions): WorkbenchSlotProvider<LabelerWorkbenchBusinessContext>[] {
  return [
    {
      id: "toolbar",
      label: "工具",
      icon: <LayoutPanelTop className="h-4 w-4" />,
      renderTopTab() {
        return <TopCapsule icon={<LayoutPanelTop className="h-4 w-4" />} label="工具" />;
      },
      renderPopover(context) {
        return (
          <ToolbarPopoverContent
            context={context}
            onToggleEditMode={onToggleEditMode}
            onResetWorkbench={onResetWorkbench}
          />
        );
      },
      getPresentation(_context, env) {
        if (!env.regionCollapsed) {
          return "default";
        }
        return env.regionSize <= 64 ? "collapsed" : "narrow";
      },
      renderNarrow(context) {
        return <ToolbarCollapsedContent context={context} />;
      },
      renderCollapsed(context) {
        return <ToolbarCollapsedContent context={context} />;
      },
      render(context, env) {
        return <ToolbarSlotContent context={context} env={env} navigate={navigate} />;
      },
    },
    {
      id: "summary",
      label: "进度",
      icon: <Sparkles className="h-4 w-4" />,
      renderTopTab(context) {
        return <TopCapsule icon={<Sparkles className="h-4 w-4" />} label="进度" badge={context.queuePositionLabel ?? context.queueRows.length} />;
      },
      renderPopover(context) {
        return <SummaryPopoverContent context={context} />;
      },
      getPresentation(_context, env) {
        if (!env.regionCollapsed) {
          return "default";
        }
        return env.regionSize <= 64 ? "collapsed" : "narrow";
      },
      renderNarrow(context) {
        return <SummaryCollapsedContent context={context} />;
      },
      renderCollapsed(context) {
        return <SummaryCollapsedContent context={context} />;
      },
      render(context, env) {
        return <SummarySlotContent context={context} env={env} />;
      },
    },
    {
      id: "queue",
      label: "队列",
      icon: <ClipboardList className="h-4 w-4" />,
      getPresentation(_context, env) {
        if (!env.regionCollapsed) {
          return "default";
        }
        return env.regionSize <= 64 ? "collapsed" : "narrow";
      },
      renderBodyTab(context) {
        return (
          <TopCapsule
            icon={<ClipboardList className="h-4 w-4" />}
            label="队列"
            badge={context.queueRows.filter((row) => row.assignmentStatus === "CLAIMED").length}
          />
        );
      },
      renderNarrow(context) {
        return <QueueCollapsedContent context={context} />;
      },
      renderCollapsed(context) {
        return <QueueCollapsedContent context={context} />;
      },
      render(context, env) {
        return <QueueSlotContent context={context} env={env} />;
      },
    },
    {
      id: "payload",
      label: "题面",
      renderBodyTab() {
        return <TopCapsule icon={<Sparkles className="h-4 w-4" />} label="题面" />;
      },
      render(context, env) {
        return <PayloadSlotContent context={context} env={env} />;
      },
    },
    {
      id: "annotate",
      label: "作答",
      renderBodyTab(context) {
        return <TopCapsule icon={<Send className="h-4 w-4" />} label="作答" badge={context.annotateFieldCount} />;
      },
      getPresentation(_context, env) {
        if (!env.regionCollapsed) {
          return "default";
        }
        return env.regionSize <= 64 ? "collapsed" : "narrow";
      },
      renderNarrow(context) {
        return <AnnotateNarrowContent context={context} />;
      },
      renderCollapsed(context) {
        return <AnnotateCollapsedContent context={context} />;
      },
      render(context, env) {
        return <AnnotateSlotContent context={context} env={env} />;
      },
    },
    {
      id: "ai",
      label: "审核",
      icon: <ClipboardCheck className="h-4 w-4" />,
      renderTopTab(context) {
        return <TopCapsule icon={<ClipboardCheck className="h-4 w-4" />} label="审核" badge={resolveReviewTabBadge(context)} />;
      },
      renderBodyTab(context) {
        return <TopCapsule icon={<ClipboardCheck className="h-4 w-4" />} label="审核" badge={resolveReviewTabBadge(context)} />;
      },
      renderNarrow(context) {
        return <AiNarrowContent context={context} />;
      },
      renderCollapsed(context) {
        return <AiCollapsedContent context={context} />;
      },
      render(context, env) {
        return <AiSlotContent context={context} env={env} />;
      },
    },
    {
      id: WORKBENCH_WIDGET_HOST_SLOT_ID,
      label: "组件",
      getPresentation(_context, env) {
        if (!env.regionCollapsed) {
          return "default";
        }
        return env.regionSize <= 64 ? "collapsed" : "narrow";
      },
      renderNarrow(context, env) {
        return <LabelerWidgetTabRailContent context={context} env={env} />;
      },
      renderCollapsed(context, env) {
        return <LabelerWidgetTabRailContent context={context} env={env} />;
      },
      renderTabCustom(context, env) {
        const tab = context.layoutTabs.find((item) => item.id === env.tabId);
        const widgetId = tab?.widgetId;
        if (!widgetId) {
          return <span className="truncate">{tab?.label ?? "组件"}</span>;
        }
        const title =
          resolveLabelerWidgetDefinition(widgetId, context.formSchema, context.renderPrefs)?.title
          ?? tab?.label
          ?? widgetId;
        return <span className="truncate">{title}</span>;
      },
      render(context, env) {
        return <LabelerWidgetTabSlotContent context={context} env={env} />;
      },
    },
  ];
}
