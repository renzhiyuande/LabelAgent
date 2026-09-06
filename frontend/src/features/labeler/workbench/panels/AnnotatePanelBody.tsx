import type { WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import { LabelerAnnotationPanel } from "./LabelerAnnotationPanel";
import { canSaveDraft } from "../../work/utils/work-queue-status";
import type { LabelerWorkbenchBusinessContext } from "../types";
import type { LabelerWorkbenchViewMode } from "../LabelerSlotFrame";

export function AnnotatePanelBody({
  context,
  viewMode,
  showPanelHeader = true,
}: {
  context: LabelerWorkbenchBusinessContext;
  viewMode: WidgetViewMode;
  showPanelHeader?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <LabelerAnnotationPanel
      viewMode={viewMode as LabelerWorkbenchViewMode}
      resource={context.annotateResource}
      formContext={{
        templateVersionId: context.work.templateVersion.templateVersionId,
        assignmentId: context.work.assignment.id,
        submissionId: context.work.submission.id,
        taskId: context.work.task.taskId,
        itemPayload: context.work.taskItem.payload,
        displaySchema: context.displaySchema,
        llmSuggestInvokeAllowed: canSaveDraft(context.work),
      }}
      values={context.values}
      currentUser={context.currentUser}
      formId="labeler-work-form"
      contentKey={context.assignmentId}
      onChange={context.onFieldChange}
      onSubmit={context.onSubmit}
      fieldCount={context.annotateFieldCount}
      fieldErrors={context.annotateFieldErrors}
      onFieldErrorsChange={context.onAnnotateFieldErrorsChange}
      pending={context.contentPendingOnly}
      showPanelHeader={showPanelHeader}
      />
    </div>
  );
}
