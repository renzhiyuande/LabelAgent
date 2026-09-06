"use client";

import type { OptionItem } from "../../../schema/types";
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { cn } from "../../../lib/utils";

interface MultiSelectFieldControlProps {
  label: string;
  value: unknown;
  options: OptionItem[];
  disabled?: boolean;
  onChange: (value: string[]) => void;
}

export function MultiSelectFieldControl({
  label,
  value,
  options,
  disabled,
  onChange,
}: MultiSelectFieldControlProps) {
  const selectedValues = Array.isArray(value) ? value.map((item) => String(item)) : [];
  const allOptionValues = options.map((option) => String(option.value));
  const allSelected =
    allOptionValues.length > 0 && allOptionValues.every((optionValue) => selectedValues.includes(optionValue));
  const someSelected = selectedValues.length > 0 && !allSelected;
  const selectedLabels = options
    .filter((option) => selectedValues.includes(String(option.value)))
    .map((option) => option.label);

  const toggleSelectAll = () => {
    onChange(allSelected ? [] : allOptionValues);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between rounded-2xl" disabled={disabled}>
          <span className="truncate">
            {selectedLabels.length > 0 ? selectedLabels.join(", ") : `选择${label}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder={`搜索${label}`} />
          {options.length > 0 ? (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                disabled={disabled}
                onCheckedChange={toggleSelectAll}
              />
              <span>全选</span>
            </label>
          ) : null}
          <CommandList>
            <CommandEmpty>暂无选项</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const checked = selectedValues.includes(String(option.value));
                return (
                  <CommandItem
                    key={String(option.value)}
                    value={option.label}
                    onSelect={() => {
                      onChange(
                        checked
                          ? selectedValues.filter((item) => item !== String(option.value))
                          : [...selectedValues, String(option.value)],
                      );
                    }}
                  >
                    <Checkbox checked={checked} />
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
