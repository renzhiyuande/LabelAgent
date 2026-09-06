"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { flattenTreeOptions, type TreeOptionNode } from "../../../adapters/tree-options";

interface TreeSelectFieldControlProps {
  label: string;
  value: unknown;
  options: TreeOptionNode[];
  placeholder?: string;
  disabled?: boolean;
  rootLabel?: string;
  onChange: (value: string) => void;
}

export function TreeSelectFieldControl({
  label,
  value,
  options,
  placeholder,
  disabled,
  rootLabel = "无（根级）",
  onChange,
}: TreeSelectFieldControlProps) {
  const normalizedValue =
    value == null || value === "" || value === 0 || value === "0" ? "0" : String(value);
  const flatOptions = flattenTreeOptions(options);

  return (
    <Select
      value={normalizedValue}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(nextValue === "0" ? "0" : nextValue)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? `请选择${label}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">{rootLabel}</SelectItem>
        {flatOptions.map((option) => (
          <SelectItem key={String(option.value)} value={String(option.value)}>
            <span className="inline-flex min-w-0 items-center">
              {option.depth > 0 ? (
                <span aria-hidden className="shrink-0 text-slate-300 dark:text-slate-600">
                  {"│ ".repeat(Math.max(option.depth - 1, 0))}
                  {"└ "}
                </span>
              ) : null}
              <span className="truncate">{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
