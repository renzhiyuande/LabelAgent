"use client";

import { cn } from "../../../lib/utils";
import {
  DICT_TAG_CLASS_PRESETS,
  resolvePreviewTagClassName,
} from "../../../utils/dict-tag-style";
import { TextFieldControl } from "./TextFieldControl";

interface DictTagClassNameFieldControlProps {
  value: unknown;
  disabled?: boolean;
  placeholder?: string;
  formValues?: Record<string, unknown>;
  onChange: (value: string) => void;
}

export function DictTagClassNameFieldControl({
  value,
  disabled,
  placeholder,
  formValues,
  onChange,
}: DictTagClassNameFieldControlProps) {
  const normalized = value == null ? "" : String(value);
  const tone = formValues?.tone;

  return (
    <div className="grid gap-2">
      <TextFieldControl
        value={value}
        disabled={disabled}
        placeholder={placeholder ?? "留空则自动使用 lh-tag {色调}"}
        onChange={onChange}
      />
      <div className="flex flex-wrap gap-2">
        {DICT_TAG_CLASS_PRESETS.map((preset) => {
          const active = normalized === preset.value;
          const previewClass = preset.value || resolvePreviewTagClassName(tone, "");
          return (
            <button
              key={preset.label}
              type="button"
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted",
              )}
              onClick={() => onChange(preset.value)}
            >
              {preset.value ? (
                <span className={previewClass}>示例</span>
              ) : (
                <span className={previewClass}>自动</span>
              )}
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
