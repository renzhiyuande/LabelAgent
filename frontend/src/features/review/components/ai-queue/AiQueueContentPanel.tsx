import { WorkbenchContentShell } from "@/components/workbench";
import type { AiQueueDetail } from "../../types";
import { AiQueueEmptyState } from "./AiQueueEmptyState";
import { AiQueueSubmissionHeader } from "./sections/AiQueueSubmissionHeader";
import { SchemaSectionWidgetBody } from "../../workbench/panels/ai-queue/SchemaSectionWidgetBody";
import { buildAiQueueContentSections } from "../../workbench/panels/ai-queue/resolve-ai-queue-widgets";
import type { AiQueueWorkbenchBusinessContext } from "../../workbench/types";
import { createStubReviewRenderPrefsHandlers } from "../../workbench/review-render-prefs";

interface AiQueueContentPanelProps {
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

export function AiQueueContentPanel({ detail, pending = false }: AiQueueContentPanelProps) {
  const context = toContext(detail);
  const sections = buildAiQueueContentSections(context);

  if (!detail) {
    return <AiQueueEmptyState />;
  }

  return (
    <WorkbenchContentShell
      pending={pending}
      className="bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--muted)/0.88)_100%)]"
    >
      <AiQueueSubmissionHeader detail={detail} />
      <div className="flex h-0 min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3">
        {sections.map((section) => (
          <SchemaSectionWidgetBody key={section.id} section={section} viewMode="cards" />
        ))}
      </div>
    </WorkbenchContentShell>
  );
}
