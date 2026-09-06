"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import {
  collectSubtreeLeafValues,
  filterTreeOptions,
  flattenLeafTreeOptions,
  mergeSelectedValues,
  type TreeOptionNode,
} from "../../../adapters/tree-options";

interface TreeMultiSelectFieldControlProps {
  label: string;
  value: unknown;
  options: TreeOptionNode[];
  disabled?: boolean;
  onChange: (value: string[]) => void;
}

function renderTreeIndent(depth: number) {
  if (depth <= 0) {
    return null;
  }
  return (
    <span aria-hidden className="shrink-0 text-slate-300 dark:text-slate-600">
      {"│ ".repeat(Math.max(depth - 1, 0))}
      {"└ "}
    </span>
  );
}

export function TreeMultiSelectFieldControl({
  label,
  value,
  options,
  disabled,
  onChange,
}: TreeMultiSelectFieldControlProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const selectedValues = Array.isArray(value) ? value.map((item) => String(item)) : [];
  const leafOptions = useMemo(() => flattenLeafTreeOptions(options), [options]);
  const filteredOptions = useMemo(
    () => (searchKeyword.trim() ? filterTreeOptions(options, searchKeyword) : options),
    [options, searchKeyword],
  );
  const allLeafValues = leafOptions.map((option) => String(option.value));
  const allSelected =
    allLeafValues.length > 0 && allLeafValues.every((optionValue) => selectedValues.includes(optionValue));
  const someSelected = selectedValues.length > 0 && !allSelected;
  const labelByValue = useMemo(
    () => new Map(leafOptions.map((option) => [String(option.value), option.label])),
    [leafOptions],
  );
  const selectedLabels = selectedValues
    .map((item) => labelByValue.get(item))
    .filter((item): item is string => Boolean(item));

  const toggleSelectAll = () => {
    onChange(allSelected ? [] : allLeafValues);
  };

  function resolveGroupSelection(leafValues: string[]) {
    const allGroupSelected =
      leafValues.length > 0 && leafValues.every((optionValue) => selectedValues.includes(optionValue));
    const someGroupSelected = leafValues.some((optionValue) => selectedValues.includes(optionValue)) && !allGroupSelected;
    return { allGroupSelected, someGroupSelected };
  }

  function toggleGroupSelect(leafValues: string[], allGroupSelected: boolean) {
    onChange(mergeSelectedValues(selectedValues, leafValues, !allGroupSelected));
  }

  function renderTreeNodes(nodes: TreeOptionNode[], depth = 0): ReactNode[] {
    return nodes.flatMap((node) => {
      const hasChildren = Boolean(node.children && node.children.length > 0);
      if (hasChildren) {
        const groupLeafValues = collectSubtreeLeafValues(node);
        const { allGroupSelected, someGroupSelected } = resolveGroupSelection(groupLeafValues);
        return [
          <label
            key={`group-${String(node.value)}-${depth}`}
            className={cn(
              "flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-900",
              depth > 0 && "pl-4",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {renderTreeIndent(depth)}
            <Checkbox
              checked={allGroupSelected ? true : someGroupSelected ? "indeterminate" : false}
              disabled={disabled}
              onCheckedChange={() => toggleGroupSelect(groupLeafValues, allGroupSelected)}
            />
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{node.label}</span>
          </label>,
          ...renderTreeNodes(node.children ?? [], depth + 1),
        ];
      }

      const checked = selectedValues.includes(String(node.value));
      return [
        <CommandItem
          key={String(node.value)}
          value={`${node.label} ${node.value}`}
          onSelect={() => {
            onChange(
              checked
                ? selectedValues.filter((item) => item !== String(node.value))
                : [...selectedValues, String(node.value)],
            );
          }}
        >
          {renderTreeIndent(depth)}
          <Checkbox checked={checked} />
          <span className="truncate">{node.label}</span>
        </CommandItem>,
      ];
    });
  }

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
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`搜索${label}`}
            value={searchKeyword}
            onValueChange={setSearchKeyword}
          />
          {leafOptions.length > 0 ? (
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
            <CommandGroup>{renderTreeNodes(filteredOptions)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
