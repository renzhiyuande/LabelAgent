"use client";

import { useMemo } from "react";
import { Combobox } from '../../../components/ui/combobox';
import { normalizeSnowflakeId } from "../../../lib/id-utils";
import { flattenSelectableTreeOptions, type TreeOptionNode } from "../../../adapters/tree-options";

interface RemoteTreeSelectFieldControlProps {
  label: string;
  value: unknown;
  options: TreeOptionNode[];
  placeholder?: string;
  disabled?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  rootLabel?: string;
  onChange: (value: string) => void;
  onSearchChange?: (value: string) => void;
}

export function RemoteTreeSelectFieldControl({
  label,
  value,
  options,
  placeholder,
  disabled,
  searchValue = "",
  searchPlaceholder,
  rootLabel = "无（根级）",
  onChange,
  onSearchChange,
}: RemoteTreeSelectFieldControlProps) {
  const normalizedValue =
    value == null || value === "" || value === 0 || value === "0"
      ? "0"
      : (normalizeSnowflakeId(value) ?? String(value));

  const { comboboxOptions, flatOptionByValue } = useMemo(() => {
    const flatOptions = flattenSelectableTreeOptions(options);
    return {
      comboboxOptions: flatOptions.map((option) => ({
        value: String(option.value),
        label: option.displayLabel,
        keywords: `${option.displayLabel} ${option.label} ${option.value}`,
        disabled: option.disabled,
      })),
      flatOptionByValue: new Map(flatOptions.map((option) => [String(option.value), option])),
    };
  }, [options]);

  const resolvedPlaceholder = placeholder ?? searchPlaceholder ?? `请选择${label}`;

  return (
    <Combobox
      value={normalizedValue}
      onValueChange={onChange}
      options={comboboxOptions}
      prefixOptions={[{ value: "0", label: rootLabel }]}
      placeholder={resolvedPlaceholder}
      disabled={disabled}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      shouldFilter={false}
      renderOptionLabel={(option) => {
        const meta = flatOptionByValue.get(option.value);
        if (!meta) {
          return <span className="truncate">{option.label}</span>;
        }
        return (
          <span className="inline-flex min-w-0 items-center">
            {meta.depth > 0 ? (
              <span aria-hidden className="shrink-0 text-slate-300 dark:text-slate-600">
                {"│ ".repeat(Math.max(meta.depth - 1, 0))}
                {"└ "}
              </span>
            ) : null}
            <span
              className={
                meta.disabled
                  ? "truncate font-medium text-muted-foreground"
                  : "truncate"
              }
            >
              {meta.disabled ? meta.label : meta.label}
            </span>
          </span>
        );
      }}
    />
  );
}
