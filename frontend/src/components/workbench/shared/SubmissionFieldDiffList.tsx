"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { collectSchemaDictCodes } from "@/low-code/utils/collect-schema-dicts";
import { useSchemaDictOptions } from "@/low-code/hooks/use-schema-dict-options";
import type { FormFieldSchema, FormSchema, OptionItem } from "@/low-code/schema/types";
import { resolveSchemaFieldDisplayLabel } from "@/low-code/utils/schema-field-display";
import { cn } from "@/lib/utils";
import { isAnnotateOnlyVisibleField } from "./schema-data/filter-reviewer-display-schema";
import {
  flattenSubmitDataDiff,
  type FlatSubmissionFieldDiff,
} from "./flatten-submit-data-diff";

export interface SubmissionFieldDiffItem {
  field: string;
  changeType: string;
  oldValue?: unknown;
  newValue?: unknown;
}

const CHANGE_TYPE_LABEL: Record<FlatSubmissionFieldDiff["changeType"], string> = {
  CHANGED: "已修改",
  ADDED: "新增",
  REMOVED: "已删除",
};

function buildSchemaFieldMaps(schema: FormSchema | null | undefined): {
  labelByPath: Map<string, string>;
  fieldByPath: Map<string, FormFieldSchema>;
  pathOrder: string[];
} {
  const labelByPath = new Map<string, string>();
  const fieldByPath = new Map<string, FormFieldSchema>();
  const pathOrder: string[] = [];

  const walk = (fields: FormFieldSchema[]) => {
    for (const field of fields) {
      if (!isAnnotateOnlyVisibleField(field)) {
        continue;
      }
      const binding = field.path ?? field.key;
      if (binding) {
        labelByPath.set(binding, field.label?.trim() || binding);
        fieldByPath.set(binding, field);
        pathOrder.push(binding);
      }
      if (field.fields?.length) {
        walk(field.fields);
      }
    }
  };

  for (const section of schema?.sections ?? []) {
    walk(section.fields);
  }

  return { labelByPath, fieldByPath, pathOrder };
}

function sortDiffsBySchema(
  diffs: FlatSubmissionFieldDiff[],
  pathOrder: string[],
): FlatSubmissionFieldDiff[] {
  const orderIndex = new Map(pathOrder.map((path, index) => [path, index]));
  return [...diffs].sort((a, b) => {
    const aIndex = orderIndex.get(a.path);
    const bIndex = orderIndex.get(b.path);
    if (aIndex != null && bIndex != null) {
      return aIndex - bIndex;
    }
    if (aIndex != null) {
      return -1;
    }
    if (bIndex != null) {
      return 1;
    }
    return a.path.localeCompare(b.path, "zh-CN");
  });
}

function formatPathFallbackLabel(path: string): string {
  const segment = path.split(".").pop() ?? path;
  return segment.replace(/_/g, " ");
}

function formatDisplayValue(
  field: FormFieldSchema | undefined,
  value: unknown,
  dictOptions: Record<string, OptionItem[]>,
): string {
  if (field) {
    return resolveSchemaFieldDisplayLabel(field, value, dictOptions);
  }
  if (value == null) {
    return "—";
  }
  if (typeof value === "string") {
    return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "—";
  }
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "—";
    }
    if (value.every((item) => typeof item === "string")) {
      return value.join("、");
    }
    return `${value.length} 项`;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

interface DiffValueTextProps {
  text: string;
  tone: "old" | "new" | "removed";
  dense?: boolean;
}

function DiffValueText({ text, tone, dense }: DiffValueTextProps) {
  return (
    <span
      className={cn(
        "min-w-0 break-words leading-5",
        dense ? "text-xs" : "text-sm",
        tone === "old" && "text-muted-foreground line-through decoration-border",
        tone === "new" && "font-medium text-foreground",
        tone === "removed" && "text-destructive line-through",
      )}
      title={text}
    >
      {text}
    </span>
  );
}

interface SubmissionFieldDiffListProps {
  diffs?: SubmissionFieldDiffItem[];
  previousData?: Record<string, unknown> | null;
  currentData?: Record<string, unknown> | null;
  schema?: FormSchema | null;
  className?: string;
  emptyMessage?: string;
  compact?: boolean;
}

export function SubmissionFieldDiffList({
  diffs,
  previousData,
  currentData,
  schema,
  className,
  emptyMessage = "本轮与上一轮标注结果一致，无字段差异",
  compact = false,
}: SubmissionFieldDiffListProps) {
  const { labelByPath, fieldByPath, pathOrder } = useMemo(() => buildSchemaFieldMaps(schema), [schema]);
  const dictCodes = useMemo(() => collectSchemaDictCodes(schema), [schema]);
  const dictOptions = useSchemaDictOptions(dictCodes);

  const flatDiffs = useMemo(() => {
    if (previousData != null || currentData != null) {
      const flattened = flattenSubmitDataDiff(previousData, currentData);
      const filtered =
        pathOrder.length > 0
          ? flattened.filter((item) => labelByPath.has(item.path))
          : flattened;
      return sortDiffsBySchema(filtered, pathOrder);
    }
    return sortDiffsBySchema(
      (diffs ?? []).map((item) => ({
        path: item.field,
        changeType: item.changeType as FlatSubmissionFieldDiff["changeType"],
        oldValue: item.oldValue,
        newValue: item.newValue,
      })),
      pathOrder,
    );
  }, [currentData, diffs, labelByPath, pathOrder, previousData]);

  if (flatDiffs.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const labelCol = compact ? "minmax(4.5rem,6rem)" : "minmax(5rem,7.5rem)";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/70 bg-muted/40",
        className,
      )}
    >
      <ul className="divide-y divide-border/60">
        {flatDiffs.map((diff) => {
          const field = fieldByPath.get(diff.path);
          const label = labelByPath.get(diff.path) ?? formatPathFallbackLabel(diff.path);
          const oldText = formatDisplayValue(field, diff.oldValue, dictOptions);
          const newText = formatDisplayValue(field, diff.newValue, dictOptions);

          return (
            <li
              key={diff.path}
              className={cn(
                "grid items-start gap-x-3 border-b border-border/60 px-3 last:border-b-0",
                compact ? "py-2" : "py-2.5",
              )}
              style={{ gridTemplateColumns: `${labelCol} 1fr` }}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium leading-5 text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{CHANGE_TYPE_LABEL[diff.changeType]}</p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                {diff.changeType !== "ADDED" ? (
                  <DiffValueText
                    text={oldText}
                    tone={diff.changeType === "REMOVED" ? "removed" : "old"}
                    dense={compact}
                  />
                ) : null}
                {diff.changeType === "CHANGED" ? (
                  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                ) : null}
                {diff.changeType !== "REMOVED" ? (
                  <DiffValueText text={newText} tone="new" dense={compact} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
