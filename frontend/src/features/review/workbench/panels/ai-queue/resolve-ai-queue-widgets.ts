import { buildAiInsightPanelSections } from "@/components/workbench";
import { buildSplitTemplateContentSections } from "@/components/workbench/shared/schema-data/split-template-content-sections";
import type { WorkbenchPanelSectionDefinition } from "@/components/workbench/shared/panel-sections/types";
import {
  isWidgetGroupEntry,
  parseWidgetGroupEntry,
  type WidgetBoardGroup,
} from "@/components/workbench2/utils/widget-board-groups";
import type { AiQueueWorkbenchWidgetId } from "../../ai-queue-widget-registry";
import type { AiQueueWidgetBoardId } from "../../ai-queue-widget-board-storage";
import type { AiQueueWorkbenchBusinessContext } from "../../types";

const CONTENT_WIDGET_IDS = ["content-payload", "content-annotate"] as const satisfies AiQueueWorkbenchWidgetId[];

const INSIGHT_WIDGET_IDS = [
  "insight-dimensions",
  "insight-verdict",
  "insight-prompt",
  "insight-raw-response",
  "insight-timeline",
] as const satisfies AiQueueWorkbenchWidgetId[];

const WIDGET_SECTION_ID: Record<AiQueueWorkbenchWidgetId, string> = {
  "content-payload": "payload",
  "content-annotate": "annotate",
  "insight-dimensions": "dimensions",
  "insight-verdict": "verdict",
  "insight-prompt": "prompt",
  "insight-raw-response": "raw_response",
  "insight-timeline": "timeline",
};

export function buildAiQueueContentSections(context: AiQueueWorkbenchBusinessContext): WorkbenchPanelSectionDefinition[] {
  const { detail } = context;
  if (!detail) {
    return [];
  }
  const split = buildSplitTemplateContentSections({
    payload: detail.payload,
    annotateData: detail.annotateData,
    annotateSchema: detail.annotateSchema,
    payloadFallbackTitle: "题目上下文",
    annotateFallbackTitle: "标注结果",
  });

  if (split) {
    const sections: WorkbenchPanelSectionDefinition[] = [];
    if (split.payload) {
      sections.push(split.payload);
    }
    sections.push(split.annotate);
    return sections;
  }

  const sections: WorkbenchPanelSectionDefinition[] = [];
  if (Object.keys(detail.payload).length > 0) {
    sections.push({
      id: "payload",
      title: "题目导入数据",
      data: detail.payload,
      schema: detail.payloadSchema,
      emptyMessage: "暂无题目导入数据",
    });
  }
  sections.push({
    id: "annotate",
    title: "标注结果快照",
    data: detail.annotateData,
    schema: detail.annotateSchema,
    emptyMessage: "暂无标注快照",
  });
  return sections;
}

export function buildAiQueueInsightSections(context: AiQueueWorkbenchBusinessContext): WorkbenchPanelSectionDefinition[] {
  const { detail } = context;
  if (!detail) {
    return [];
  }
  return buildAiInsightPanelSections({
    insight: detail.aiInsight,
    agentVersion: detail.agentVersion,
    promptTemplate: detail.promptTemplate,
    rawResponseText: detail.rawResponseText,
    timeline: detail.timeline,
    showMockBadge: false,
    hasRealAiReview: detail.hasRealAiReview,
  });
}

export function resolveAllAvailableAiQueueWidgetIds(
  context: AiQueueWorkbenchBusinessContext,
): AiQueueWorkbenchWidgetId[] {
  if (!context.detail) {
    return [];
  }

  const contentSectionIds = new Set(buildAiQueueContentSections(context).map((section) => section.id));
  const insightSectionIds = new Set(buildAiQueueInsightSections(context).map((section) => section.id));

  return (Object.keys(WIDGET_SECTION_ID) as AiQueueWorkbenchWidgetId[]).filter((widgetId) => {
    const sectionId = WIDGET_SECTION_ID[widgetId];
    return contentSectionIds.has(sectionId) || insightSectionIds.has(sectionId);
  });
}

export function normalizeAiQueueBoardOrder(
  boardId: AiQueueWidgetBoardId,
  storedOrder: string[],
  context: AiQueueWorkbenchBusinessContext,
  options?: {
    hiddenWidgetIds?: Set<string>;
    tabWidgetIds?: Set<string>;
    groups?: Record<string, WidgetBoardGroup>;
  },
): string[] {
  const available = resolveAllAvailableAiQueueWidgetIds(context);
  const availableSet = new Set(available);
  const next: string[] = [];

  for (const id of storedOrder) {
    const groupId = parseWidgetGroupEntry(id);
    if (groupId) {
      if (!options?.groups?.[groupId]) {
        continue;
      }
      if (options?.hiddenWidgetIds?.has(id)) {
        continue;
      }
      if (options?.tabWidgetIds?.has(id)) {
        continue;
      }
      if (!next.includes(id)) {
        next.push(id);
      }
      continue;
    }
    if (isWidgetGroupEntry(id)) {
      continue;
    }
    if (!availableSet.has(id as AiQueueWorkbenchWidgetId)) {
      continue;
    }
    if (options?.hiddenWidgetIds?.has(id)) {
      continue;
    }
    if (options?.tabWidgetIds?.has(id)) {
      continue;
    }
    if (!next.includes(id)) {
      next.push(id);
    }
  }

  return next;
}

export function findAiQueueSection(
  context: AiQueueWorkbenchBusinessContext,
  _boardId: AiQueueWidgetBoardId,
  widgetId: AiQueueWorkbenchWidgetId,
): WorkbenchPanelSectionDefinition | null {
  const sectionId = WIDGET_SECTION_ID[widgetId];
  const sections = [...buildAiQueueContentSections(context), ...buildAiQueueInsightSections(context)];
  return sections.find((section) => section.id === sectionId) ?? null;
}
