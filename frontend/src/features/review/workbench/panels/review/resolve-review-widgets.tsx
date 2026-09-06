import { buildAiInsightPanelSections } from "@/components/workbench";
import { buildSplitTemplateContentSections } from "@/components/workbench/shared/schema-data/split-template-content-sections";
import { filterFormSchemaForAnnotateDisplay } from "@/components/workbench/shared/schema-data/filter-reviewer-display-schema";
import type { WorkbenchPanelSectionDefinition } from "@/components/workbench/shared/panel-sections/types";
import {
  isWidgetGroupEntry,
  parseWidgetGroupEntry,
  type WidgetBoardGroup,
} from "@/components/workbench2/utils/widget-board-groups";
import { reviewDefaultTabWidgetIds } from "../../review-widget-layout-defaults";
import { collectWidgetsFromBoardOrder, removeGroupedWidgetDuplicates } from "../../review-widget-order-utils";
import { buildReviewAnnotateMetaSections } from "./build-review-annotate-meta-sections";
import { isReviewWidgetId, type ReviewWorkbenchWidgetId } from "../../review-widget-registry";
import type { ReviewWidgetBoardId } from "../../review-widget-board-storage";
import type { ReviewWorkbenchBusinessContext } from "../../types";

const WIDGET_SECTION_ID: Partial<Record<ReviewWorkbenchWidgetId, string>> = {
  "content-payload": "payload",
  "content-annotate-diff": "annotate-diff",
  "content-annotate": "annotate",
  "content-annotate-timeline": "annotate-timeline",
  "ai-dimensions": "dimensions",
  "ai-verdict": "verdict",
  "ai-prompt": "prompt",
  "ai-raw-response": "raw_response",
};

export function buildReviewContentSections(
  context: ReviewWorkbenchBusinessContext,
): WorkbenchPanelSectionDefinition[] {
  const { detail } = context;
  if (!detail) {
    return [];
  }

  const lastReviewCommentBanner = detail.lastReviewComment ? (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/40">
      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">上一轮打回意见</p>
      <p className="mt-1 text-sm leading-6 text-amber-950 dark:text-amber-50">{detail.lastReviewComment}</p>
    </div>
  ) : undefined;

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
      sections.push({ ...split.payload, bodyLead: lastReviewCommentBanner });
    } else if (lastReviewCommentBanner) {
      sections.push({
        ...split.annotate,
        bodyLead: lastReviewCommentBanner,
      });
      return sections;
    }
    sections.push(split.annotate);
    return sections;
  }

  const sections: WorkbenchPanelSectionDefinition[] = [];
  const hasImportedPayload = Object.keys(detail.payload).length > 0;
  if (hasImportedPayload) {
    sections.push({
      id: "payload",
      title: "题目导入数据",
      data: detail.payload,
      schema: detail.payloadSchema,
      emptyMessage: "暂无题目导入数据",
      bodyLead: lastReviewCommentBanner,
    });
  }
  sections.push({
    id: "annotate",
    title: "标注结果快照",
    data: detail.annotateData,
    schema: filterFormSchemaForAnnotateDisplay(detail.annotateSchema),
    emptyMessage: "暂无标注快照",
    bodyLead: hasImportedPayload ? undefined : lastReviewCommentBanner,
  });
  return sections;
}

export function buildReviewInsightSections(
  context: ReviewWorkbenchBusinessContext,
): WorkbenchPanelSectionDefinition[] {
  return buildAiInsightPanelSections({
    insight: context.aiInsight,
    agentVersion: context.detail?.aiInsight.modelName
      ? `Agent · ${context.detail.aiInsight.modelName}`
      : undefined,
    promptTemplate: context.detail?.promptTemplate,
    rawResponseText: context.detail?.rawResponseText,
    showMockBadge: false,
    hasRealAiReview: context.detail?.hasRealAiReview ?? true,
  });
}

export function findReviewSection(
  context: ReviewWorkbenchBusinessContext,
  widgetId: ReviewWorkbenchWidgetId,
): WorkbenchPanelSectionDefinition | null {
  const sectionId = WIDGET_SECTION_ID[widgetId];
  if (!sectionId) {
    return null;
  }
  const sections = [
    ...buildReviewContentSections(context),
    ...(context.detail ? buildReviewAnnotateMetaSections(context.detail) : []),
    ...buildReviewInsightSections(context),
  ];
  return sections.find((section) => section.id === sectionId) ?? null;
}

export function isReviewSchemaWidget(widgetId: ReviewWorkbenchWidgetId): boolean {
  return widgetId in WIDGET_SECTION_ID;
}

const REVIEW_FORM_WIDGET_IDS = ["review-header", "review-comment", "review-actions"] as const satisfies ReviewWorkbenchWidgetId[];

const REVIEW_AI_WIDGET_IDS = ["ai-dimensions", "ai-verdict"] as const satisfies ReviewWorkbenchWidgetId[];

export function resolveAllAvailableReviewWidgetIds(
  context: ReviewWorkbenchBusinessContext,
): ReviewWorkbenchWidgetId[] {
  const next: ReviewWorkbenchWidgetId[] = [...REVIEW_FORM_WIDGET_IDS, ...REVIEW_AI_WIDGET_IDS];
  for (const widgetId of ["ai-prompt", "ai-raw-response"] as const) {
    if (findReviewSection(context, widgetId)) {
      next.push(widgetId);
    }
  }

  if (context.detail) {
    next.unshift("content-header");
    for (const widgetId of [
      "content-payload",
      "content-annotate-diff",
      "content-annotate",
      "content-annotate-timeline",
    ] as const) {
      if (findReviewSection(context, widgetId)) {
        next.push(widgetId);
      }
    }
  }

  return next.filter((id, index, list) => isReviewWidgetId(id) && list.indexOf(id) === index);
}

export function normalizeReviewBoardOrder(
  boardId: ReviewWidgetBoardId,
  storedOrder: string[],
  context: ReviewWorkbenchBusinessContext,
  options?: {
    hiddenWidgetIds?: Set<string>;
    tabWidgetIds?: Set<string>;
    groups?: Record<string, WidgetBoardGroup>;
  },
): string[] {
  const available = resolveAllAvailableReviewWidgetIds(context);
  const availableSet = new Set(available);
  const boardGroups = options?.groups ?? {};
  const groupedWidgetIds = collectWidgetsFromBoardOrder(
    storedOrder.filter((entry) => parseWidgetGroupEntry(entry) != null),
    boardGroups,
  );
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
    if (!availableSet.has(id as ReviewWorkbenchWidgetId)) {
      continue;
    }
    if (groupedWidgetIds.has(id)) {
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

  return removeGroupedWidgetDuplicates(next, boardGroups);
}

function insertWidgetIfMissing(order: string[], widgetId: string, anchorId: string, position: "before" | "after"): string[] {
  if (order.includes(widgetId)) {
    return order;
  }
  const anchorIndex = order.indexOf(anchorId);
  if (anchorIndex < 0) {
    return [...order, widgetId];
  }
  const next = [...order];
  next.splice(position === "before" ? anchorIndex : anchorIndex + 1, 0, widgetId);
  return next;
}

export function migrateReviewWidgetOrder(
  boardId: ReviewWidgetBoardId,
  order: string[],
  boardGroups: Record<string, WidgetBoardGroup> = {},
): string[] {
  let next: string[] = [];
  for (const id of order) {
    if (boardId === "content" && id === "content-body") {
      if (!next.includes("content-annotate-diff")) {
        next.push("content-annotate-diff");
      }
      if (!next.includes("content-annotate")) {
        next.push("content-annotate");
      }
      if (!next.includes("content-annotate-timeline")) {
        next.push("content-annotate-timeline");
      }
      continue;
    }
    if (boardId === "ai" && id === "ai-insight") {
      if (!next.includes("ai-dimensions")) {
        next.push("ai-dimensions");
      }
      if (!next.includes("ai-verdict")) {
        next.push("ai-verdict");
      }
      continue;
    }
    if (!next.includes(id)) {
      next.push(id);
    }
  }
  if (boardId === "content") {
    const placed = collectWidgetsFromBoardOrder(next, boardGroups);
    const tabWidgetSet = new Set<string>(reviewDefaultTabWidgetIds);

    if (!placed.has("content-payload")) {
      next = insertWidgetIfMissing(next, "content-payload", "content-header", "after");
      if (!next.includes("content-payload") && !placed.has("content-payload")) {
        next = insertWidgetIfMissing(next, "content-payload", "content-annotate", "after");
      }
    }

    // 差异 / 时间线默认在独立 widget tab，不再强行塞回题目看板
    if (!placed.has("content-annotate-diff") && !tabWidgetSet.has("content-annotate-diff")) {
      next = insertWidgetIfMissing(next, "content-annotate-diff", "content-annotate", "before");
    }
    if (!placed.has("content-annotate-timeline") && !tabWidgetSet.has("content-annotate-timeline")) {
      next = insertWidgetIfMissing(next, "content-annotate-timeline", "content-annotate", "after");
    }
  }
  return next;
}
