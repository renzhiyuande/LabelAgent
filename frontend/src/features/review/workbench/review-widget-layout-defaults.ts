import type { WidgetLayoutMode, WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import type { WidgetBoardGroup } from "@/components/workbench2/utils/widget-board-groups";
import { toWidgetGroupEntry } from "@/components/workbench2/utils/widget-board-groups";
import type { ReviewWorkbenchWidgetId } from "./review-widget-registry";

type ReviewWidgetBoardId = "content" | "review" | "ai";

/** 题目上下文 + 标注结果并排组合（稳定 ID，便于默认种子） */
export const REVIEW_CONTENT_PRIMARY_GROUP_ID = "wg-default-content-primary";

/**
 * 来自当前审核工作台 localStorage 快照（2026-06）的 widget 布局默认值。
 * - 题目区：stack；标题条 + 左右并排（上下文 | 标注）
 * - 差异 / 时间线：独立 widget tab（见 reviewWorkbench2Tabs）
 */
export const reviewWidgetLayoutDefaults = {
  content: {
    layout: "stack" as WidgetLayoutMode,
    order: ["content-header", toWidgetGroupEntry(REVIEW_CONTENT_PRIMARY_GROUP_ID)] as string[],
    /** 首项 content-header 为 auto 高度，仅第二项参与 fr 分配 */
    splitSizes: [0.06, 0.94],
    activeTab: "content-header",
    viewModes: {
      "content-header": "cards",
      "content-payload": "inline",
      "content-annotate": "inline",
      "content-annotate-diff": "inline",
      "content-annotate-timeline": "inline",
    } satisfies Partial<Record<ReviewWorkbenchWidgetId, WidgetViewMode>>,
    groups: {
      [REVIEW_CONTENT_PRIMARY_GROUP_ID]: {
        id: REVIEW_CONTENT_PRIMARY_GROUP_ID,
        widgetIds: ["content-payload", "content-annotate"],
        layout: "row",
        splitSizes: [0.5, 0.5],
      },
    } satisfies Record<string, WidgetBoardGroup>,
  },
  review: {
    layout: "stack" as WidgetLayoutMode,
    order: ["review-header", "review-comment", "review-actions"],
    splitSizes: [0.12, 0.68, 0.2],
    activeTab: "review-header",
    viewModes: {
      "review-header": "cards",
      "review-comment": "cards",
      "review-actions": "cards",
    } satisfies Partial<Record<ReviewWorkbenchWidgetId, WidgetViewMode>>,
    groups: {} satisfies Record<string, WidgetBoardGroup>,
  },
  ai: {
    layout: "tabs" as WidgetLayoutMode,
    order: ["ai-dimensions", "ai-verdict"],
    splitSizes: [0.55, 0.45],
    activeTab: "ai-verdict",
    viewModes: {
      "ai-dimensions": "cards",
      "ai-verdict": "cards",
    } satisfies Partial<Record<ReviewWorkbenchWidgetId, WidgetViewMode>>,
    groups: {} satisfies Record<string, WidgetBoardGroup>,
  },
} as const satisfies Record<
  ReviewWidgetBoardId,
  {
    layout: WidgetLayoutMode;
    order: string[];
    splitSizes: number[];
    activeTab: string;
    viewModes: Partial<Record<ReviewWorkbenchWidgetId, WidgetViewMode>>;
    groups: Record<string, WidgetBoardGroup>;
  }
>;

/** 默认放到工作台独立 widget tab，不占题目看板纵向空间 */
export const reviewDefaultTabWidgetIds = [
  "content-annotate-diff",
  "content-annotate-timeline",
] as const satisfies readonly ReviewWorkbenchWidgetId[];
