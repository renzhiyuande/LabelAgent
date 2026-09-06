import { useMemo } from "react";
import { getValueAtPath } from "@/low-code/utils/object-path";
import { collectSchemaDictCodes } from "@/low-code/utils/collect-schema-dicts";
import { useSchemaDictOptions } from "@/low-code/hooks/use-schema-dict-options";
import type { FormSchema } from "@/low-code/schema/types";
import { JsonCodeBlock } from "../JsonCodeBlock";
import { buildSchemaDisplayValues } from "./build-schema-display-values";
import {
  isAnnotateOnlyVisibleField,
  isReviewerVisibleField,
} from "./filter-reviewer-display-schema";
import { SchemaFieldCard } from "./SchemaFieldCard";
import { SchemaFieldInlineList } from "./SchemaFieldInline";

/** inline=紧凑行；cards=卡片；json=原始 JSON */
export type SchemaDataViewMode = "inline" | "cards" | "json";

export function normalizeSchemaDataViewMode(mode: string | undefined): SchemaDataViewMode {
  if (mode === "fields") {
    return "cards";
  }
  if (mode === "inline" || mode === "cards" || mode === "json") {
    return mode;
  }
  return "inline";
}

interface SchemaDataViewProps {
  data: Record<string, unknown>;
  schema?: FormSchema | null;
  mode: SchemaDataViewMode;
  jsonTitle?: string;
  emptyMessage?: string;
  jsonMaxHeight?: string;
  /** 为 true 时仅展示标注填写项，隐藏题目上下文只读控件 */
  annotateOnly?: boolean;
}

export function SchemaDataView({
  data,
  schema,
  mode,
  jsonTitle = "JSON 视图",
  emptyMessage = "暂无数据",
  jsonMaxHeight,
  annotateOnly = false,
}: SchemaDataViewProps) {
  const isVisibleField = annotateOnly ? isAnnotateOnlyVisibleField : isReviewerVisibleField;
  const hasData = Object.keys(data).length > 0;
  const displayValues = useMemo(
    () => (schema ? buildSchemaDisplayValues(schema, data) : data),
    [data, schema],
  );

  const flatFields = useMemo(
    () => schema?.sections.flatMap((section) => section.fields.filter(isVisibleField)) ?? [],
    [isVisibleField, schema],
  );
  const sections = schema?.sections ?? [];
  const dictCodes = useMemo(() => collectSchemaDictCodes(schema), [schema]);
  const dictOptions = useSchemaDictOptions(dictCodes);

  if (mode === "json" || flatFields.length === 0) {
    if (!hasData) {
      return <p className="text-sm text-slate-500">{emptyMessage}</p>;
    }
    return <JsonCodeBlock value={data} maxHeight={jsonMaxHeight} className="border-0 bg-transparent p-0 dark:bg-transparent" />;
  }

  if (mode === "inline") {
    return (
      <div className="space-y-4">
        {sections.map((section) => {
          if (section.fields.length === 0) {
            return null;
          }
          return (
            <div key={section.key} className="space-y-2">
              {section.title && sections.length > 1 ? (
                <p className="px-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {section.title}
                </p>
              ) : null}
              <SchemaFieldInlineList
                fields={section.fields.filter(isVisibleField)}
                values={displayValues}
                context={displayValues}
                dictOptions={dictOptions}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        if (section.fields.length === 0) {
          return null;
        }
        return (
          <div key={section.key} className="space-y-2">
            {section.title && sections.length > 1 ? (
              <p className="px-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {section.title}
              </p>
            ) : null}
            <div className="grid gap-2.5">
              {section.fields.filter(isVisibleField).map((field) => {
                const path = field.path ?? field.key;
                const value = getValueAtPath(displayValues, path);
                return (
                  <SchemaFieldCard
                    key={field.key}
                    field={field}
                    value={value}
                    context={displayValues}
                    dictOptions={dictOptions}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
