"use client";

import type { OptionItem } from "../../../schema/types";
import { Checkbox } from '../../../components/ui/checkbox';

const optionLabelClassName = "flex items-center gap-3 text-sm text-foreground";

interface CheckboxGroupFieldControlProps {
  value: unknown;
  options: OptionItem[];
  disabled?: boolean;
  onChange: (value: string[]) => void;
}

export function CheckboxGroupFieldControl({
  value,
  options,
  disabled,
  onChange,
}: CheckboxGroupFieldControlProps) {
  const selectedValues = Array.isArray(value) ? value.map((item) => String(item)) : [];

  return (
    <div className="grid gap-3 rounded-2xl border border-border p-4">
      {options.map((option) => {
        const checked = selectedValues.includes(String(option.value));
        return (
          <label key={String(option.value)} className={optionLabelClassName}>
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(nextChecked) => {
                const nextValues = nextChecked
                  ? [...selectedValues, String(option.value)]
                  : selectedValues.filter((item) => item !== String(option.value));
                onChange(nextValues);
              }}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
