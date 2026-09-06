import type { EditableWidgetItem, WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import { SchemaSectionWidgetBody } from "./panels/ai-queue/SchemaSectionWidgetBody";
import { ContentHeaderPanelBody } from "./panels/review/ContentHeaderPanelBody";
import { ReviewActionsPanelBody } from "./panels/review/ReviewActionsPanelBody";
import { ReviewCommentPanelBody } from "./panels/review/ReviewCommentPanelBody";
import { ReviewHeaderPanelBody } from "./panels/review/ReviewHeaderPanelBody";
import { findReviewSection, isReviewSchemaWidget } from "./panels/review/resolve-review-widgets";
import { REVIEW_WIDGET_DEFINITIONS, type ReviewWorkbenchWidgetId } from "./review-widget-registry";
import type { ReviewWidgetBoardId } from "./review-widget-board-storage";
import type { ReviewWorkbenchBusinessContext } from "./types";

export interface BuildReviewWidgetOptions {
  context: ReviewWorkbenchBusinessContext;
  boardId: ReviewWidgetBoardId;
  widgetModes: Record<string, WidgetViewMode>;
  setWidgetMode: (widgetId: string, mode: WidgetViewMode) => void;
  /** 独立 widget tab 宿主：隐藏重复标题并占满可滚动区域 */
  standaloneTab?: boolean;
}

const INLINE_DEFAULT_WIDGETS = new Set<ReviewWorkbenchWidgetId>([
  "content-annotate-timeline",
  "ai-prompt",
  "ai-raw-response",
]);

export function buildReviewWidget(
  widgetId: ReviewWorkbenchWidgetId,
  options: BuildReviewWidgetOptions,
): EditableWidgetItem | null {
  const { context, widgetModes, setWidgetMode, standaloneTab = false } = options;

  if (isReviewSchemaWidget(widgetId)) {
    const definition = REVIEW_WIDGET_DEFINITIONS[widgetId];
    const section = findReviewSection(context, widgetId);
    if (!section) {
      return null;
    }

    const defaultViewMode: WidgetViewMode = INLINE_DEFAULT_WIDGETS.has(widgetId) ? "inline" : "cards";
    const mode = widgetModes[widgetId] ?? defaultViewMode;

    return {
      id: widgetId,
      title: section.title?.trim() || definition.title,
      defaultViewMode,
      viewModeConfigurable: false,
      fillHeight: true,
      body: (
        <SchemaSectionWidgetBody
          section={section}
          viewMode={mode}
          showViewToggle={context.editMode}
          onViewModeChange={(next) => setWidgetMode(widgetId, next)}
          compactHeader
          fillHeight
          standaloneTab={standaloneTab}
          annotateOnly={widgetId === "content-annotate"}
        />
      ),
      json: section.data ?? null,
    };
  }

  switch (widgetId) {
    case "content-header":
      return {
        id: "content-header",
        title: "题目标题",
        viewModeConfigurable: false,
        fillHeight: false,
        className: "shrink-0",
        body: <ContentHeaderPanelBody context={context} />,
      };
    case "review-header":
      return {
        id: "review-header",
        title: "审核标题",
        viewModeConfigurable: false,
        fillHeight: false,
        className: "shrink-0",
        body: <ReviewHeaderPanelBody context={context} />,
      };
    case "review-comment":
      return {
        id: "review-comment",
        title: "审核意见",
        viewModeConfigurable: false,
        fillHeight: true,
        body: <ReviewCommentPanelBody context={context} />,
        json: { comment: context.comment },
      };
    case "review-actions":
      return {
        id: "review-actions",
        title: "审核操作",
        viewModeConfigurable: false,
        fillHeight: false,
        className: "shrink-0",
        body: <ReviewActionsPanelBody context={context} />,
      };
    default:
      return null;
  }
}
