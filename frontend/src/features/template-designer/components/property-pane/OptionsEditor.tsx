"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import type { OptionItem } from "@/low-code/schema/types";

interface OptionsEditorProps {
  options: OptionItem[];
  onChange: (next: OptionItem[]) => void;
}

function createOption(index: number): OptionItem {
  return {
    label: `选项 ${index + 1}`,
    value: `option_${index + 1}`,
  };
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const updateAt = (index: number, patch: Partial<OptionItem>) => {
    onChange(options.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeAt = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...options, createOption(options.length)]);
  };

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">静态选项</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          用于 select / radioGroup / checkboxGroup / multiSelect。
        </p>
      </div>

      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          暂无选项
        </p>
      ) : (
        <ul className="space-y-3">
          {options.map((option, index) => (
            <li
              key={`${String(option.value)}-${index}`}
              className="space-y-2 rounded-lg border border-border bg-muted/80 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">选项 {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600"
                  onClick={() => removeAt(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-600 dark:text-slate-300">label</label>
                <TextFieldControl
                  value={option.label}
                  onChange={(value) => updateAt(index, { label: value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-600 dark:text-slate-300">value</label>
                <TextFieldControl
                  value={String(option.value)}
                  onChange={(value) => updateAt(index, { value })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        添加选项
      </Button>
    </section>
  );
}
