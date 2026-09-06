import type { AiQueueWidgetBoardId } from "./ai-queue-widget-board-storage";

export type AiQueueWorkbenchWidgetId =
  | "content-payload"
  | "content-annotate"
  | "insight-dimensions"
  | "insight-verdict"
  | "insight-prompt"
  | "insight-raw-response"
  | "insight-timeline";

export interface AiQueueWidgetDefinition {
  id: AiQueueWorkbenchWidgetId;
  defaultBoard: AiQueueWidgetBoardId;
  title: string;
  transferable: boolean;
}

export const AI_QUEUE_WIDGET_DEFINITIONS: Record<AiQueueWorkbenchWidgetId, AiQueueWidgetDefinition> = {
  "content-payload": {
    id: "content-payload",
    defaultBoard: "content",
    title: "题目上下文",
    transferable: true,
  },
  "content-annotate": {
    id: "content-annotate",
    defaultBoard: "content",
    title: "标注结果",
    transferable: true,
  },
  "insight-dimensions": {
    id: "insight-dimensions",
    defaultBoard: "insight",
    title: "维度评分",
    transferable: true,
  },
  "insight-verdict": {
    id: "insight-verdict",
    defaultBoard: "insight",
    title: "AI 结论",
    transferable: true,
  },
  "insight-prompt": {
    id: "insight-prompt",
    defaultBoard: "insight",
    title: "审核 Prompt",
    transferable: true,
  },
  "insight-raw-response": {
    id: "insight-raw-response",
    defaultBoard: "insight",
    title: "原始响应",
    transferable: true,
  },
  "insight-timeline": {
    id: "insight-timeline",
    defaultBoard: "insight",
    title: "处理日志",
    transferable: true,
  },
};

export const ALL_AI_QUEUE_WIDGET_IDS = Object.keys(AI_QUEUE_WIDGET_DEFINITIONS) as AiQueueWorkbenchWidgetId[];

export function defaultBoardForAiQueueWidget(widgetId: string): AiQueueWidgetBoardId | null {
  if (!isAiQueueWidgetId(widgetId)) {
    return null;
  }
  return AI_QUEUE_WIDGET_DEFINITIONS[widgetId].defaultBoard;
}

export function isAiQueueWidgetId(value: string): value is AiQueueWorkbenchWidgetId {
  return value in AI_QUEUE_WIDGET_DEFINITIONS;
}
