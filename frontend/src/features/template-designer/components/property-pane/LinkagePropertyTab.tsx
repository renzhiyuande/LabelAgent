"use client";

import { useMemo } from "react";
import type { ConditionMeta, FormFieldSchema } from "@/low-code/schema/types";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import { buildFieldOptions } from "../../utils/field-options";
import { ConditionListEditor } from "./ConditionListEditor";

interface LinkagePropertyTabProps {
  field: FormFieldSchema;
}

export function LinkagePropertyTab({ field }: LinkagePropertyTabProps) {
  const updateField = useDesignerEditorStore((state) => state.updateField);
  const updateNestedField = useDesignerEditorStore((state) => state.updateNestedField);
  const getScopeFields = useDesignerEditorStore((state) => state.getScopeFields);
  const selectedParentKey = useDesignerEditorStore((state) => state.selectedParentKey);
  const scopeFields = getScopeFields();

  const fieldOptions = useMemo(
    () => buildFieldOptions(scopeFields, field.key),
    [scopeFields, field.key],
  );

  const patchConditions = (
    key: "visibleWhen" | "disabledWhen",
    next: ConditionMeta[],
  ) => {
    const patch = { [key]: next.length > 0 ? next : undefined };
    if (selectedParentKey && field.key !== selectedParentKey) {
      updateNestedField(selectedParentKey, field.key, patch);
      return;
    }
    updateField(field.key, patch);
  };

  return (
    <div className="space-y-6 p-4">
      <ConditionListEditor
        title="显示条件 visibleWhen"
        description="配置后：仅当表单值满足下列规则时显示本字段（hidden 仍为最高优先级）。"
        conditions={field.visibleWhen ?? []}
        fieldOptions={fieldOptions}
        onChange={(next) => patchConditions("visibleWhen", next)}
      />

      <div className="border-t border-slate-200 dark:border-slate-800" />

      <ConditionListEditor
        title="禁用条件 disabledWhen"
        description="配置后：满足下列规则时字段只读不可编辑（readonly 仍会叠加）。"
        conditions={field.disabledWhen ?? []}
        fieldOptions={fieldOptions}
        onChange={(next) => patchConditions("disabledWhen", next)}
      />
    </div>
  );
}
