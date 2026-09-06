"use client";

import { useMemo } from "react";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import type { FormFieldSchema } from "@/low-code/schema/types";
import { normalizeArrayDefaultValue } from "@/low-code/utils/form-values";

interface DefaultValueEditorProps {
  component: string;
  value: unknown;
  field?: FormFieldSchema;
  onChange: (next: unknown) => void;
}

const BOOLEAN_OPTIONS = [
  { label: "true", value: "true" },
  { label: "false", value: "false" },
];

function formatDefaultValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function parseDefaultValue(raw: string, component: string, field?: FormFieldSchema): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (component === "array" && field) {
    const wrapped = trimmed.startsWith("{") || trimmed.startsWith("[") ? trimmed : `{${trimmed}}`;
    try {
      const parsed = JSON.parse(wrapped) as unknown;
      return normalizeArrayDefaultValue(field, parsed);
    } catch {
      return normalizeArrayDefaultValue(field, trimmed);
    }
  }

  if (component === "switch") {
    return trimmed === "true";
  }

  if (component === "numberRange") {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed.split(",").map((item) => Number(item.trim())).filter((item) => !Number.isNaN(item));
    }
  }

  if (component === "dateRange" || component === "dateTimeRange" || component === "multiSelect" || component === "checkboxGroup") {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  if (component === "jsonEditor" || component === "codeEditor") {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed;
    }
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed;
}

export function DefaultValueEditor({ component, value, field, onChange }: DefaultValueEditorProps) {
  const arrayPlaceholder = useMemo(() => {
    if (component !== "array" || !field) {
      return "可输入字符串、数字、布尔值或 JSON";
    }
    const arrayKey = field.path ?? field.key;
    return `[{"field_6":"000"}] 或 {"${arrayKey}.0.field_6":"000","${arrayKey}.1.field_6":"111"}`;
  }, [component, field]);

  if (component === "switch") {
    return (
      <section className="space-y-1.5">
        <label className="text-xs text-slate-600 dark:text-slate-300">defaultValue</label>
        <SelectFieldControl
          label="defaultValue"
          value={value === undefined ? "" : String(Boolean(value))}
          options={BOOLEAN_OPTIONS}
          emptyLabel="未设置"
          onChange={(next) => onChange(next ? next === "true" : undefined)}
        />
      </section>
    );
  }

  return (
    <section className="space-y-1.5">
      <label className="text-xs text-slate-600 dark:text-slate-300">defaultValue</label>
      <TextFieldControl
        value={formatDefaultValue(value)}
        placeholder={arrayPlaceholder}
        onChange={(raw) => {
          onChange(parseDefaultValue(raw, component, field));
        }}
      />
      {component === "array" ? (
        <p className="text-[11px] leading-4 text-slate-500">
          推荐格式：[{`{"子字段key":"值"}`}]；也支持 {`{"${field?.path ?? field?.key ?? "array"}.0.子字段key":"值"}`} 写法
        </p>
      ) : null}
    </section>
  );
}
