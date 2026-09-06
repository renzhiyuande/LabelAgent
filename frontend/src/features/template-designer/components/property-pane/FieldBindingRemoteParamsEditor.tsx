"use client";

import { useMemo } from "react";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import type { RemoteOptionMeta, RemoteParamBinding } from "@/low-code/schema/types";
import { readFieldBinding, writeFieldBinding } from "../../utils/option-source-profiles";
import type { ConditionFieldOption } from "./ConditionListEditor";

interface FieldBindingRemoteParamsEditorProps {
  source: string;
  paramName: string;
  title: string;
  description: string;
  params?: Record<string, RemoteParamBinding>;
  fieldOptions: ConditionFieldOption[];
  onChange: (next: Pick<RemoteOptionMeta, "params">) => void;
}

function ensureCurrentFieldOption(
  options: ConditionFieldOption[],
  currentValue: string | undefined,
): ConditionFieldOption[] {
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return options;
  }
  return [{ label: `${currentValue}（当前值）`, value: currentValue }, ...options];
}

export function FieldBindingRemoteParamsEditor({
  source,
  paramName,
  title,
  description,
  params,
  fieldOptions,
  onChange,
}: FieldBindingRemoteParamsEditorProps) {
  const fieldPath = readFieldBinding(params, paramName);
  const options = useMemo(
    () => ensureCurrentFieldOption(fieldOptions, fieldPath),
    [fieldOptions, fieldPath],
  );

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div>
        <label className="text-xs font-medium text-slate-700 dark:text-slate-200">{title}</label>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      {fieldOptions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          当前区块暂无可绑定的表单字段，请先在表单中添加对应字段。
        </p>
      ) : (
        <SelectFieldControl
          label={title}
          value={fieldPath ?? ""}
          options={options}
          emptyLabel="选择表单字段"
          onChange={(nextFieldPath) =>
            onChange({
              params: writeFieldBinding(source, params, paramName, nextFieldPath || undefined),
            })
          }
        />
      )}
    </div>
  );
}
