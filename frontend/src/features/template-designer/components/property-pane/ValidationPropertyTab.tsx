"use client";

import type { FormFieldSchema } from "@/low-code/schema/types";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import { RulesListEditor } from "./RulesListEditor";

interface ValidationPropertyTabProps {
  field: FormFieldSchema;
}

export function ValidationPropertyTab({ field }: ValidationPropertyTabProps) {
  const updateField = useDesignerEditorStore((state) => state.updateField);
  const updateNestedField = useDesignerEditorStore((state) => state.updateNestedField);
  const selectedParentKey = useDesignerEditorStore((state) => state.selectedParentKey);
  const patchField = (patch: Partial<FormFieldSchema>) => {
    if (selectedParentKey && field.key !== selectedParentKey) {
      updateNestedField(selectedParentKey, field.key, patch);
      return;
    }
    updateField(field.key, patch);
  };

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        `required` 可通过基础 Tab 的必填开关控制；此处配置其余 ValidationRuleMeta 规则。
      </p>
      <RulesListEditor
        rules={field.rules ?? []}
        onChange={(rules) => patchField({ rules: rules.length ? rules : undefined })}
      />
    </div>
  );
}
