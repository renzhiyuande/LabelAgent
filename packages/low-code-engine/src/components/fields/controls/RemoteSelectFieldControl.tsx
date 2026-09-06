"use client";

import { useMemo } from "react";
import { Combobox, type ComboboxOption } from '../../../components/ui/combobox';
import type { OptionItem } from "../../../schema/types";

interface RemoteSelectFieldControlProps {
  label: string;
  value: unknown;
  options: OptionItem[];
  placeholder?: string;
  disabled?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onChange: (value: string) => void;
  onSearchChange?: (value: string) => void;
}

export function RemoteSelectFieldControl({
  label,
  value,
  options,
  placeholder,
  disabled,
  searchValue = "",
  searchPlaceholder,
  onChange,
  onSearchChange,
}: RemoteSelectFieldControlProps) {
  const normalizedOptions = useMemo<ComboboxOption[]>(
    () =>
      options.map((option) => ({
        value: option.value == null ? "" : String(option.value),
        label: option.label,
      })),
    [options],
  );

  const hasExplicitEmptyOption = normalizedOptions.some((option) => option.value === "");
  const selectedValue = value == null ? "" : String(value);
  const matchedOption = normalizedOptions.find((option) => option.value === selectedValue);
  const resolvedPlaceholder = placeholder ?? searchPlaceholder ?? `请选择${label}`;
  const fallbackLabel = matchedOption?.label ?? (selectedValue ? selectedValue : "");

  return (
    <Combobox
      value={selectedValue}
      onValueChange={onChange}
      options={normalizedOptions}
      prefixOptions={hasExplicitEmptyOption ? [] : [{ value: "", label: "请选择" }]}
      placeholder={resolvedPlaceholder}
      disabled={disabled}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      shouldFilter={false}
      displayLabelOverride={matchedOption ? undefined : fallbackLabel || undefined}
    />
  );
}
