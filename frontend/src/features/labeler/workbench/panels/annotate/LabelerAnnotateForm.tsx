import type { AuthenticatedUser } from "@/types";
import type { OptionItem, RemoteOptionQuery, ResourceMeta } from "@/low-code/schema/types";
import {
  LHResourceForm,
  type ResourceFormContext,
} from "@/low-code/components/forms/LHResourceForm";

interface LabelerAnnotateFormProps {
  resource: ResourceMeta;
  formContext?: ResourceFormContext;
  values: Record<string, unknown>;
  currentUser?: AuthenticatedUser | null;
  formId: string;
  fieldCount: number;
  fieldErrors: Record<string, string>;
  onFieldErrorsChange: (errors: Record<string, string>) => void;
  onChange: (key: string, value: unknown) => void;
  onSubmit: () => Promise<void>;
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
}

export function LabelerAnnotateForm({
  resource,
  formContext,
  values,
  currentUser,
  formId,
  fieldCount,
  fieldErrors,
  onFieldErrorsChange,
  onChange,
  onSubmit,
  loadRemoteOptions,
}: LabelerAnnotateFormProps) {
  if (fieldCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
        当前模板未配置可编辑的标注字段。请在模板设计器中将需要填写的字段设置为「标注 / input」角色。
      </div>
    );
  }

  return (
    <LHResourceForm
      resource={resource}
      formContext={formContext}
      mode="edit"
      values={values}
      currentUser={currentUser}
      formId={formId}
      variant="labeler-annotate"
      onChange={onChange}
      onSubmit={onSubmit}
      loadRemoteOptions={loadRemoteOptions}
      fieldErrors={fieldErrors}
      onFieldErrorsChange={onFieldErrorsChange}
    />
  );
}
