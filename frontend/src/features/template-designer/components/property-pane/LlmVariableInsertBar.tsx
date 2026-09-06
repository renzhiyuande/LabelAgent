"use client";

import { cn } from "@/lib/utils";
import type { FieldOption } from "../../utils/field-options";
import { fieldOptionInsertTitle, fieldOptionShortLabel } from "../../utils/field-option-label";

interface LlmVariableInsertBarProps {
  fieldOptions: FieldOption[];
  usedPaths: string[];
  onInsert: (path: string) => void;
}

export function LlmVariableInsertBar({ fieldOptions, usedPaths, onInsert }: LlmVariableInsertBarProps) {
  const used = new Set(usedPaths);

  if (fieldOptions.length === 0) {
    return (
      <p className="text-[11px] leading-4 text-slate-500">模板中暂无题目展示字段可插入。</p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] leading-4 text-slate-500">
        点击题目字段名插入到当前提示词；编辑区以「字段名」展示，保存为 {`{{path}}`}。
      </p>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
        {fieldOptions.map((option) => {
          const referenced = used.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              title={fieldOptionInsertTitle(option)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                referenced
                  ? "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/60"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
              )}
              onClick={() => onInsert(option.value)}
            >
              {fieldOptionShortLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
