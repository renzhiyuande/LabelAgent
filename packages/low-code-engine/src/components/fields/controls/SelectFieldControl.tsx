"use client";

import { useMemo } from "react";
import type { OptionItem } from "../../../schema/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

interface SelectFieldControlProps {
  label: string;
  value: unknown;
  options: OptionItem[];
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  onChange: (value: string) => void;
}

export function SelectFieldControl({
  label,
  value,
  options,
  placeholder,
  disabled,
  emptyLabel = "请选择",
  onChange,
}: SelectFieldControlProps) {
  const emptyValue = "__lh_select_empty__";
  const normalizedOptions = useMemo(() => {
    const seen = new Set<string>();
    const next: Array<OptionItem & { _value: string }> = [];
    for (const option of options) {
      const rawValue = option.value == null ? "" : String(option.value);
      const selectValue = rawValue === "" ? emptyValue : rawValue;
      if (seen.has(selectValue)) {
        continue;
      }
      seen.add(selectValue);
      next.push({ ...option, _value: rawValue });
    }
    return next;
  }, [options]);
  const hasExplicitEmptyOption = normalizedOptions.some((option) => option._value === "");
  const selectedValue = value == null ? "" : String(value);
  const selectValue = selectedValue === "" ? emptyValue : selectedValue;

  return (
    <Select
      value={selectValue}
      disabled={disabled}
      onValueChange={(nextValue) => {
        const normalized = nextValue === emptyValue ? "" : nextValue;
        if (normalized !== selectedValue) {
          onChange(normalized);
        }
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? `请选择${label}`} />
      </SelectTrigger>
      <SelectContent>
        {hasExplicitEmptyOption ? null : <SelectItem value={emptyValue}>{emptyLabel}</SelectItem>}
        {normalizedOptions.map((option, index) => (
          <SelectItem
            key={option._value === "" ? `__empty__${index}` : option._value}
            value={option._value === "" ? emptyValue : option._value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
