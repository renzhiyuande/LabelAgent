"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "./command";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

export interface ComboboxOption {
  value: string;
  label: string;
  keywords?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  prefixOptions?: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** 远程搜索时应设为 false，避免 cmdk 二次过滤 */
  shouldFilter?: boolean;
  className?: string;
  /** 当前值不在 options 中时的展示文案（如远程选项尚未加载完） */
  displayLabelOverride?: string;
  renderOptionLabel?: (option: ComboboxOption, selected: boolean) => ReactNode;
}

export function Combobox({
  value,
  onValueChange,
  options,
  prefixOptions = [],
  placeholder,
  disabled = false,
  emptyText = "暂无选项",
  searchValue = "",
  onSearchChange,
  shouldFilter = false,
  className,
  displayLabelOverride,
  renderOptionLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [cachedLabel, setCachedLabel] = useState("");
  const [anchorWidth, setAnchorWidth] = useState<number>();
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const allOptions = useMemo(() => [...prefixOptions, ...options], [options, prefixOptions]);
  const selectedOption = allOptions.find((option) => option.value === value);

  useEffect(() => {
    if (selectedOption) {
      setCachedLabel(selectedOption.label);
      return;
    }
    if (value && displayLabelOverride) {
      setCachedLabel(displayLabelOverride);
    }
  }, [displayLabelOverride, selectedOption, value]);

  useEffect(() => {
    if (!open || !anchorRef.current) {
      return;
    }
    const syncWidth = () => {
      if (anchorRef.current) {
        setAnchorWidth(anchorRef.current.offsetWidth);
      }
    };
    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(anchorRef.current);
    return () => observer.disconnect();
  }, [open]);

  const displayLabel = selectedOption?.label ?? cachedLabel;
  const inputDisplay = open ? searchValue : displayLabel;

  function handleOpenChange(nextOpen: boolean) {
    if (disabled) {
      return;
    }
    setOpen(nextOpen);
    if (!nextOpen) {
      // 推迟重置搜索词，避免在 Popover 关闭/卸载过程中同步触发父组件重渲染造成 reconciliation 冲突
      requestAnimationFrame(() => onSearchChange?.(""));
      return;
    }
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function handleSelect(option: ComboboxOption) {
    if (option.disabled) {
      return;
    }
    setCachedLabel(option.label);
    if (option.value !== value) {
      onValueChange(option.value);
    }
    setOpen(false);
    // 推迟重置搜索词，与 setOpen 解耦，避免在 Popover 卸载过程中触发父组件重渲染
    requestAnimationFrame(() => onSearchChange?.(""));
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            "lh-ui-select-trigger flex w-full items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-within:ring-2 focus-within:ring-ring",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-autocomplete="list"
            aria-controls={listId}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            value={inputDisplay}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(event) => {
              onSearchChange?.(event.target.value);
              if (!open) {
                setOpen(true);
              }
            }}
            onFocus={() => {
              if (!disabled && !open) {
                setOpen(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
              }
              if (event.key === "ArrowDown" && !open && !disabled) {
                event.preventDefault();
                setOpen(true);
              }
            }}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className="shrink-0 opacity-50"
            aria-label="展开选项"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (disabled) {
                return;
              }
              if (open) {
                setOpen(false);
                return;
              }
              setOpen(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="p-0"
        style={anchorWidth ? { width: anchorWidth } : undefined}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) {
            event.preventDefault();
          }
        }}
      >
        <Command shouldFilter={shouldFilter} id={listId}>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allOptions.map((option, index) => {
                const selected = option.value === value;
                return (
                  <CommandItem
                    key={option.value === "" ? `__empty__${index}` : option.value}
                    value={option.keywords ?? `${option.label} ${option.value}`}
                    disabled={option.disabled}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                    {renderOptionLabel ? renderOptionLabel(option, selected) : option.label}
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
