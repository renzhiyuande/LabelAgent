"use client";

import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import type { FormSectionSchema } from "@/low-code/schema/types";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";

interface SectionPropertyEditorProps {
  section: FormSectionSchema;
}

export function SectionPropertyEditor({ section }: SectionPropertyEditorProps) {
  const updateSection = useDesignerEditorStore((state) => state.updateSection);

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          区块标题
        </label>
        <TextFieldControl
          value={section.title ?? ""}
          onChange={(value) => updateSection(section.key, { title: value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          区块描述
        </label>
        <TextFieldControl
          value={section.description ?? ""}
          placeholder="可选描述"
          onChange={(value) => updateSection(section.key, { description: value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          区块 key
        </label>
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {section.key}
        </p>
      </div>
    </div>
  );
}
