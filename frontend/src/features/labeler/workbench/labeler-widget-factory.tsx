import type { EditableWidgetItem, WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import { LabelerWidgetViewModeToggle } from "./chrome/LabelerWidgetViewModeToggle";
import { AiReviewPanelBody } from "./panels/AiReviewPanelBody";
import { AnnotateActionsPanelBody } from "./panels/AnnotateActionsPanelBody";
import { AnnotatePanelBody } from "./panels/AnnotatePanelBody";
import { PayloadPanelBody } from "./panels/PayloadPanelBody";
import { SectionPanelBody } from "./panels/SectionPanelBody";
import { parseSectionWidgetId, resolveSectionDisplayTitle } from "./labeler-section-widget";
import { isStaticLabelerWidgetId } from "./labeler-widget-registry";
import type { LabelerWorkbenchBusinessContext } from "./types";

export interface BuildLabelerWidgetOptions {
  context: LabelerWorkbenchBusinessContext;
  widgetModes: Record<string, WidgetViewMode>;
  setWidgetMode: (widgetId: string, mode: WidgetViewMode) => void;
}

export function buildLabelerWidget(
  widgetId: string,
  options: BuildLabelerWidgetOptions,
): EditableWidgetItem | null {
  const { context, widgetModes, setWidgetMode } = options;

  const sectionKey = parseSectionWidgetId(widgetId);
  if (sectionKey) {
    const section = context.formSchema?.sections.find((item) => item.key === sectionKey);
    const mode = widgetModes[widgetId] ?? "cards";
    return {
      id: widgetId,
      title: section ? resolveSectionDisplayTitle(section) : sectionKey,
      subtitle: "模板区块",
      defaultViewMode: "cards",
      fillHeight: true,
      headerActions: context.editMode ? (
        <LabelerWidgetViewModeToggle widgetId={widgetId} activeMode={mode} onChange={setWidgetMode} />
      ) : null,
      body: <SectionPanelBody context={context} sectionKey={sectionKey} viewMode={mode} />,
      json: {
        sectionKey,
        surface: context.renderPrefs.sectionWidgets?.[sectionKey]?.surface ?? "auto",
        payload: context.work.taskItem.payload,
        values: context.values,
      },
    };
  }

  if (!isStaticLabelerWidgetId(widgetId)) {
    return null;
  }

  switch (widgetId) {
    case "payload-main": {
      const mode = widgetModes["payload-main"] ?? "inline";
      return {
        id: "payload-main",
        title: "题面",
        subtitle: context.work.task.taskName ?? "题目内容",
        defaultViewMode: "inline",
        fillHeight: true,
        headerActions: context.editMode ? (
          <LabelerWidgetViewModeToggle widgetId="payload-main" activeMode={mode} onChange={setWidgetMode} />
        ) : null,
        body: <PayloadPanelBody context={context} viewMode={mode} />,
        json: {
          payload: context.work.taskItem.payload,
          seqNo: context.work.taskItem.seqNo,
        },
      };
    }
    case "ai-review": {
      const mode = widgetModes["ai-review"] ?? "cards";
      return {
        id: "ai-review",
        title: "审核进度",
        subtitle: "人工审核状态与审计日志",
        defaultViewMode: "cards",
        fillHeight: true,
        headerActions: context.editMode ? (
          <LabelerWidgetViewModeToggle widgetId="ai-review" activeMode={mode} onChange={setWidgetMode} />
        ) : null,
        body: <AiReviewPanelBody context={context} viewMode={mode} />,
        json: {
          submissionId: context.work.submission.id,
          currentStatus: context.work.submission.currentStatus,
          lastReview: context.work.lastReview,
        },
      };
    }
    case "annotate-main": {
      const mode = widgetModes["annotate-main"] ?? "cards";
      return {
        id: "annotate-main",
        title: "作答表单",
        subtitle: `${context.annotateFieldCount} 项可编辑字段`,
        defaultViewMode: "cards",
        fillHeight: true,
        headerActions: context.editMode ? (
          <LabelerWidgetViewModeToggle widgetId="annotate-main" activeMode={mode} onChange={setWidgetMode} />
        ) : null,
        body: <AnnotatePanelBody context={context} viewMode={mode} showPanelHeader={context.editMode} />,
        json: {
          values: context.values,
          fieldCount: context.annotateFieldCount,
        },
      };
    }
    case "annotate-actions":
      return {
        id: "annotate-actions",
        title: "提交操作",
        subtitle: context.editMode ? context.saveHint || "保存与正式提交" : undefined,
        defaultViewMode: "cards",
        viewModeConfigurable: false,
        fillHeight: false,
        className: "shrink-0",
        body: <AnnotateActionsPanelBody context={context} />,
        json: {
          saving: context.saving,
          submitting: context.submitting,
          canSubmit: context.canSubmit,
          saveHint: context.saveHint,
        },
      };
    default:
      return null;
  }
}
