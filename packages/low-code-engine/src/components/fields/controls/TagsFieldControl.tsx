"use client";

import { X } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { OptionItem } from "../../../schema/types";
import { cn } from "../../../lib/utils";

interface TagsFieldControlProps {
  value: unknown;
  options?: OptionItem[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string[]) => void;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(String).filter((item) => item.trim().length > 0);
}

export function TagsFieldControl({
  value,
  options = [],
  placeholder = "输入后按回车添加",
  disabled,
  onChange,
}: TagsFieldControlProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tags = normalizeTags(value);

  const suggestions = useMemo(() => {
    const needle = input.trim().toLowerCase();
    const available = options.filter((option) => !tags.includes(String(option.value)));
    if (!needle) {
      return available.slice(0, 8);
    }
    return available
      .filter((option) => {
        const optionValue = String(option.value);
        return (
          option.label.toLowerCase().includes(needle) || optionValue.toLowerCase().includes(needle)
        );
      })
      .slice(0, 8);
  }, [input, options, tags]);

  const showSuggestions = focused && !disabled && suggestions.length > 0;

  function addTag(raw: string) {
    const next = raw.trim();
    if (!next || tags.includes(next)) {
      setInput("");
      return;
    }
    onChange([...tags, next]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((item) => item !== tag));
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(input.replace(/,/g, ""));
      return;
    }
    if (event.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "flex min-h-[calc(var(--app-control-height)+4px)] flex-wrap items-center gap-1.5 rounded-[0.85rem] border border-slate-300 bg-white px-2 py-1.5 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 dark:border-slate-700 dark:bg-slate-900",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
          }
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/30 dark:text-primary/80"
          >
            {tag}
            {!disabled ? (
              <button
                type="button"
                className="rounded-full p-0.5 text-primary/70 hover:bg-primary/15 dark:text-primary/60 dark:hover:bg-primary/30"
                aria-label={`移除 ${tag}`}
                onClick={(event) => {
                  event.stopPropagation();
                  removeTag(tag);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100 dark:placeholder:text-slate-500"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 120);
          }}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />
      </div>
      {showSuggestions ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {suggestions.map((option) => (
            <li key={String(option.value)}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTag(String(option.value))}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
