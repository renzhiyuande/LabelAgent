"use client";

import { useId } from "react";
import type { OptionItem } from "../../../schema/types";
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';

const optionLabelClassName = "flex items-center gap-3 text-sm text-foreground";

interface RadioGroupFieldControlProps {
  name?: string;
  value: unknown;
  options: OptionItem[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function RadioGroupFieldControl({
  name,
  value,
  options,
  disabled,
  onChange,
}: RadioGroupFieldControlProps) {
  const groupId = useId();
  const selectedValue = String(value ?? "");
  const idPrefix = name ?? groupId;

  return (
    <div className="grid gap-3 rounded-2xl border border-border p-4">
      <RadioGroup
        value={selectedValue}
        disabled={disabled}
        onValueChange={onChange}
        className="grid w-full gap-3"
      >
        {options.map((option, index) => {
          const optionValue = String(option.value);
          const itemId = `${idPrefix}-${optionValue}-${index}`;
          return (
            <label key={itemId} htmlFor={itemId} className={optionLabelClassName}>
              <RadioGroupItem value={optionValue} id={itemId} />
              <span>{option.label}</span>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
