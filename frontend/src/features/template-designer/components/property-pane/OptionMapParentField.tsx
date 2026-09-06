"use client";

import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import type { ConditionFieldOption } from "./ConditionListEditor";

interface OptionMapParentFieldProps {
  value?: string;
  fieldOptions: ConditionFieldOption[];
  fieldDefaultValues?: Record<string, unknown>;
  onChange: (next: string | undefined) => void;
}

function formatHintValue(value: unknown): string {
  if (value === undefined) return "未设置默认值";
  if (typeof value === "string") return value.length > 0 ? value : '""（空字符串）';
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function OptionMapParentField({
  value,
  fieldOptions,
  fieldDefaultValues,
  onChange,
}: OptionMapParentFieldProps) {
  const activeOption = value
    ? fieldOptions.find((option) => option.value === value)
    : undefined;
  const activeValueHint = value ? fieldDefaultValues?.[value] : undefined;

  if (fieldOptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        当前区块暂无可选父字段
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-600 dark:text-slate-300">optionMap 父字段</label>
      <SelectFieldControl
        label="optionMap 父字段"
        value={value ?? ""}
        options={fieldOptions}
        emptyLabel="不联动"
        onChange={(next) => onChange(next || undefined)}
      />
      {value ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
          父字段：{activeOption?.label ?? value}
          <br />
          当前值（默认）：{formatHintValue(activeValueHint)}
          <br />
          根据父字段取值，从 optionMap 切换当前字段静态 options。
        </p>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          用于本地静态 options 联动；远程选项级联请在「远程选项 → params」中配置。
        </p>
      )}
    </div>
  );
}
