"use client";

import { Pencil, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { normalizeSnowflakeId } from "../../../lib/id-utils";
import type { OptionItem, UserFieldMeta } from "../../../schema/types";
import { userRefInitial } from "../../../utils/resolve-user-ref";
import { LHUserReference } from "../../user/LHUserReference";

interface UserFieldControlProps {
  label: string;
  value: unknown;
  options: OptionItem[];
  user?: UserFieldMeta;
  displayNameFallback?: string | null;
  placeholder?: string;
  disabled?: boolean;
  searchValue?: string;
  onChange: (value: string) => void;
  onSearchChange?: (value: string) => void;
}

export function UserFieldControl({
  label,
  value,
  options,
  user,
  displayNameFallback,
  disabled,
  searchValue = "",
  onChange,
  onSearchChange,
}: UserFieldControlProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const normalizedOptions = useMemo(
    () =>
      options
        .map((option) => ({
          value: normalizeSnowflakeId(option.value) ?? (option.value == null ? "" : String(option.value)),
          label: option.label,
        }))
        .filter((option) => option.value !== ""),
    [options],
  );

  const selectedValue = normalizeSnowflakeId(value) ?? "";
  const selectedOption = normalizedOptions.find((option) => option.value === selectedValue);
  const resolvedDisplayName =
    selectedOption?.label?.trim()
    || displayNameFallback?.trim()
    || null;
  const hasSelection = Boolean(selectedValue);

  function handleOpenChange(nextOpen: boolean) {
    if (disabled) {
      return;
    }
    setPickerOpen(nextOpen);
    if (!nextOpen) {
      onSearchChange?.("");
    }
  }

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    onSearchChange?.("");
    setPickerOpen(false);
  }

  function handleClear() {
    onChange("");
    onSearchChange?.("");
    setPickerOpen(false);
  }

  const picker = (
    <PopoverContent
      align="start"
      sideOffset={8}
      className="lh-user-picker-popover w-[min(100vw-2rem,22rem)] p-0"
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <div className="lh-user-picker">
        <input
          type="search"
          className="lh-user-picker__search"
          value={searchValue}
          placeholder={`搜索${label}`}
          disabled={disabled}
          autoFocus
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
        <ul className="lh-user-picker__list" role="listbox">
          {normalizedOptions.length === 0 ? (
            <li className="lh-user-picker__empty">暂无匹配用户</li>
          ) : (
            normalizedOptions.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <li key={option.value || "__empty__"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`lh-user-picker__option${selected ? " is-selected" : ""}`}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className="lh-user-picker__option-avatar" aria-hidden>
                      {userRefInitial(option.label)}
                    </span>
                    <span className="lh-user-picker__option-label">{option.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </PopoverContent>
  );

  if (hasSelection) {
    return (
      <Popover open={pickerOpen} onOpenChange={handleOpenChange}>
        <div className="lh-user-field lh-user-field--selected">
          <LHUserReference
            userId={selectedValue}
            displayName={resolvedDisplayName}
            role={user?.role}
            className="lh-user-ref--form"
          />
          {!disabled ? (
            <div className="lh-user-field__actions">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="lh-user-field__icon-btn"
                  aria-label={`更换${label}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <button
                type="button"
                className="lh-user-field__icon-btn"
                aria-label={`清除${label}`}
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
        {picker}
      </Popover>
    );
  }

  return (
    <Popover open={pickerOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="lh-user-field lh-user-field--empty"
          disabled={disabled}
        >
          <UserPlus className="h-4 w-4 shrink-0 opacity-70" />
          <span>选择{label}</span>
        </button>
      </PopoverTrigger>
      {picker}
    </Popover>
  );
}
