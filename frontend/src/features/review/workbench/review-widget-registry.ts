import type { ReviewWidgetBoardId } from "./review-widget-board-storage";

export type ReviewWorkbenchWidgetId =
  | "content-header"
  | "content-payload"
  | "content-annotate-diff"
  | "content-annotate"
  | "content-annotate-timeline"
  | "review-header"
  | "review-comment"
  | "review-actions"
  | "ai-dimensions"
  | "ai-verdict"
  | "ai-prompt"
  | "ai-raw-response";

export interface ReviewWidgetDefinition {
  id: ReviewWorkbenchWidgetId;
  defaultBoard: ReviewWidgetBoardId;
  title: string;
  transferable: boolean;
}

export const REVIEW_WIDGET_DEFINITIONS: Record<ReviewWorkbenchWidgetId, ReviewWidgetDefinition> = {
  "content-header": {
    id: "content-header",
    defaultBoard: "content",
    title: "题目标题",
    transferable: true,
  },
  "content-payload": {
    id: "content-payload",
    defaultBoard: "content",
    title: "题目上下文",
    transferable: true,
  },
  "content-annotate-diff": {
    id: "content-annotate-diff",
    defaultBoard: "content",
    title: "标准结果差异",
    transferable: true,
  },
  "content-annotate": {
    id: "content-annotate",
    defaultBoard: "content",
    title: "标注结果",
    transferable: true,
  },
  "content-annotate-timeline": {
    id: "content-annotate-timeline",
    defaultBoard: "content",
    title: "标注时间线",
    transferable: true,
  },
  "review-header": {
    id: "review-header",
    defaultBoard: "review",
    title: "审核标题",
    transferable: true,
  },
  "review-comment": {
    id: "review-comment",
    defaultBoard: "review",
    title: "审核意见",
    transferable: true,
  },
  "review-actions": {
    id: "review-actions",
    defaultBoard: "review",
    title: "审核操作",
    transferable: true,
  },
  "ai-dimensions": {
    id: "ai-dimensions",
    defaultBoard: "ai",
    title: "维度评分",
    transferable: true,
  },
  "ai-verdict": {
    id: "ai-verdict",
    defaultBoard: "ai",
    title: "AI 结论",
    transferable: true,
  },
  "ai-prompt": {
    id: "ai-prompt",
    defaultBoard: "ai",
    title: "审核 Prompt",
    transferable: true,
  },
  "ai-raw-response": {
    id: "ai-raw-response",
    defaultBoard: "ai",
    title: "原始响应",
    transferable: true,
  },
};

export const ALL_REVIEW_WIDGET_IDS = Object.keys(REVIEW_WIDGET_DEFINITIONS) as ReviewWorkbenchWidgetId[];

export function defaultBoardForReviewWidget(widgetId: string): ReviewWidgetBoardId | null {
  if (!isReviewWidgetId(widgetId)) {
    return null;
  }
  return REVIEW_WIDGET_DEFINITIONS[widgetId].defaultBoard;
}

export function isReviewWidgetId(value: string): value is ReviewWorkbenchWidgetId {
  return value in REVIEW_WIDGET_DEFINITIONS;
}
