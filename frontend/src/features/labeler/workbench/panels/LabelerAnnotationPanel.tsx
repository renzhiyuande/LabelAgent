import { cn } from "@/lib/utils";
import type { FormSchema } from "@/low-code/schema/types";
import { fetchRemoteOptions } from "@/low-code";
import { LabelerAnnotateForm } from "./annotate/LabelerAnnotateForm";
import type { AuthenticatedUser } from "@/types";
import type { ResourceMeta } from "@/low-code/schema/types";
import type { ResourceFormContext } from "@/low-code/components/forms/LHResourceForm";
import type { LabelerWorkbenchViewMode } from "../LabelerSlotFrame";
import { LabelerWorkContentShell } from "./LabelerWorkContentShell";
import { LabelerPanelScrollArea } from "./LabelerPanelScrollArea";
import { AnnotatePanelInlineTable } from "./annotate/AnnotatePanelInlineTable";
import { AnnotatePanelJson } from "./annotate/AnnotatePanelJson";

interface LabelerAnnotationPanelProps {
  viewMode: LabelerWorkbenchViewMode;
  resource: ResourceMeta;
  formContext?: ResourceFormContext;
  values: Record<string, unknown>;
  currentUser?: AuthenticatedUser | null;
  formId: string;
  contentKey?: string;
  onChange: (key: string, value: unknown) => void;
  onSubmit: () => Promise<void>;
  fieldCount: number;
  fieldErrors: Record<string, string>;
  onFieldErrorsChange: (errors: Record<string, string>) => void;
  pending?: boolean;
  /** 浏览态隐藏面板内标题栏 */
  showPanelHeader?: boolean;
}

function AnnotatePanelForm({
  resource,
  formContext,
  values,
  currentUser,
  formId,
  contentKey,
  onChange,
  onSubmit,
  fieldCount,
  fieldErrors,
  onFieldErrorsChange,
}: Omit<LabelerAnnotationPanelProps, "viewMode" | "pending">) {
  return (
    <div className="px-3 py-3" key={contentKey}>
      <LabelerAnnotateForm
        resource={resource}
        formContext={formContext}
        values={values}
        currentUser={currentUser}
        formId={formId}
        fieldCount={fieldCount}
        fieldErrors={fieldErrors}
        onFieldErrorsChange={onFieldErrorsChange}
        onChange={onChange}
        onSubmit={onSubmit}
        loadRemoteOptions={(source, keyword) => fetchRemoteOptions(resource, source, keyword)}
      />
    </div>
  );
}

export function LabelerAnnotationPanel({
  viewMode,
  resource,
  formContext,
  values,
  currentUser,
  formId,
  contentKey,
  onChange,
  onSubmit,
  fieldCount,
  fieldErrors,
  onFieldErrorsChange,
  pending = false,
  showPanelHeader = true,
}: LabelerAnnotationPanelProps) {
  const annotateSchema = resource.form as FormSchema;

  return (
    <LabelerWorkContentShell
      pending={pending}
      className="flex min-h-0 flex-1 flex-col bg-background/98 dark:bg-card/95"
    >
      {showPanelHeader ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 px-4 py-2.5">
          <p className="text-xs text-slate-500">标注字段</p>
          <p className="text-xs text-slate-500">共 {fieldCount} 项 · 修改后自动保存</p>
        </div>
      ) : null}

      <LabelerPanelScrollArea contentClassName={cn(viewMode === "inline" || viewMode === "json" ? "p-3" : undefined)}>
        {viewMode === "json" ? (
          <AnnotatePanelJson values={values} fieldCount={fieldCount} />
        ) : viewMode === "inline" ? (
          <AnnotatePanelInlineTable annotateSchema={annotateSchema} values={values} fieldCount={fieldCount} />
        ) : (
          <AnnotatePanelForm
            resource={resource}
            formContext={formContext}
            values={values}
            currentUser={currentUser}
            formId={formId}
            contentKey={contentKey}
            onChange={onChange}
            onSubmit={onSubmit}
            fieldCount={fieldCount}
            fieldErrors={fieldErrors}
            onFieldErrorsChange={onFieldErrorsChange}
          />
        )}
      </LabelerPanelScrollArea>
    </LabelerWorkContentShell>
  );
}
