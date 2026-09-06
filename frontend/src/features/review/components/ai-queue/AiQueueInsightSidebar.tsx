import { WorkbenchContentShell } from "@/components/workbench";
import type { AiQueueDetail } from "../../types";
import { AiQueueEmptyState } from "./AiQueueEmptyState";
import { SchemaSectionWidgetBody } from "../../workbench/panels/ai-queue/SchemaSectionWidgetBody";
import { buildAiQueueInsightSections } from "../../workbench/panels/ai-queue/resolve-ai-queue-widgets";
import type { AiQueueWorkbenchBusinessContext } from "../../workbench/types";
import { createStubReviewRenderPrefsHandlers } from "../../workbench/review-render-prefs";

interface AiQueueInsightSidebarProps {
  detail: AiQueueDetail | null;
  pending?: boolean;
}

function toContext(detail: AiQueueDetail | null): AiQueueWorkbenchBusinessContext {
  return {
    rows: [],
    detail,
    currentId: detail?.id ?? "",
    statusFilter: "all",
    focusMode: false,
    editMode: false,
    layoutTabs: [],
    canGoPrev: false,
    canGoNext: false,
    queueLoading: false,
    detailLoading: false,
    statusCounts: {},
    queueStats: null,
    statsLoading: false,
    queuePositionLabel: null,
    onStatusFilterChange: () => undefined,
    onSelectItem: () => undefined,
    onToggleFocusMode: () => undefined,
    moveTab: () => undefined,
    resetLayout: () => undefined,
    ...createStubReviewRenderPrefsHandlers(),
  };
}

export function AiQueueInsightSidebar({ detail, pending = false }: AiQueueInsightSidebarProps) {
  const context = toContext(detail);
  const sections = buildAiQueueInsightSections(context);

  if (!detail) {
    return <AiQueueEmptyState message="选择记录后查看 AI 分析" />;
  }

  return (
    <WorkbenchContentShell pending={pending} className="bg-muted/50">
      <div className="shrink-0 border-b border-border/80 px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground">AI 预审分析</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {detail.aiInsight.modelName} · {new Date(detail.aiInsight.analyzedAt).toLocaleString()}
        </p>
      </div>
      <div className="flex h-0 min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3">
        {sections.map((section) => (
          <SchemaSectionWidgetBody
            key={section.id}
            section={section}
            viewMode={section.id === "prompt" ? "inline" : "cards"}
          />
        ))}
      </div>
    </WorkbenchContentShell>
  );
}
