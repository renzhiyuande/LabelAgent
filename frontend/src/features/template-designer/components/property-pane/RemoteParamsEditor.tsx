"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import type { RemoteOptionMeta, RemoteParamBinding } from "@/low-code/schema/types";
import type { ConditionFieldOption } from "./ConditionListEditor";
import {
  hasDraftParamRows,
  paramsFromRows,
  rowsFromParams,
  serializeRemoteParams,
  type ParamRow,
} from "./remote-params-editor-state";

const ROLE_OPTIONS = [
  { label: "LABELER", value: "LABELER" },
  { label: "REVIEWER", value: "REVIEWER" },
  { label: "OWNER", value: "OWNER" },
];

const BINDING_MODE_OPTIONS = [
  { label: "静态值", value: "static" },
  { label: "表单字段", value: "field" },
];

interface RemoteParamsEditorProps {
  params?: Record<string, RemoteParamBinding>;
  searchParam?: string;
  fieldOptions: ConditionFieldOption[];
  onChange: (next: Pick<RemoteOptionMeta, "params" | "searchParam">) => void;
}

function ensureCurrentFieldOption(
  options: ConditionFieldOption[],
  currentValue: string | undefined,
): ConditionFieldOption[] {
  if (!currentValue || options.some((option) => option.value === currentValue)) {
    return options;
  }
  return [{ label: `${currentValue}（当前值）`, value: currentValue }, ...options];
}

export function RemoteParamsEditor({
  params,
  searchParam,
  fieldOptions,
  onChange,
}: RemoteParamsEditorProps) {
  const [rows, setRows] = useState<ParamRow[]>(() => rowsFromParams(params));
  const lastEmittedParamsRef = useRef(serializeRemoteParams(params));
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const emitChange = useCallback(
    (nextRows: ParamRow[], nextSearchParam = searchParam) => {
      const nextParams = paramsFromRows(nextRows);
      lastEmittedParamsRef.current = serializeRemoteParams(nextParams);
      onChange({
        params: nextParams,
        searchParam: nextSearchParam,
      });
    },
    [onChange, searchParam],
  );

  const updateRows = useCallback(
    (updater: ParamRow[] | ((current: ParamRow[]) => ParamRow[])) => {
      setRows((current) => {
        const nextRows = typeof updater === "function" ? updater(current) : updater;
        emitChange(nextRows);
        return nextRows;
      });
    },
    [emitChange],
  );

  useEffect(() => {
    const nextSignature = serializeRemoteParams(params);
    if (nextSignature === lastEmittedParamsRef.current) {
      return;
    }
    if (hasDraftParamRows(rowsRef.current)) {
      lastEmittedParamsRef.current = nextSignature;
      return;
    }
    setRows(rowsFromParams(params));
    lastEmittedParamsRef.current = nextSignature;
  }, [params]);

  const fieldSelectOptions = useMemo(() => {
    const selectedPaths = rows
      .filter((row) => row.mode === "field" && row.fieldPath.trim())
      .map((row) => row.fieldPath.trim());
    let options = fieldOptions;
    for (const path of selectedPaths) {
      options = ensureCurrentFieldOption(options, path);
    }
    return options;
  }, [fieldOptions, rows]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs text-slate-600 dark:text-slate-300">searchParam（搜索词 query 名）</label>
        <TextFieldControl
          value={searchParam ?? ""}
          placeholder="默认 keyword"
          onChange={(value) => emitChange(rowsRef.current, value.trim() || undefined)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">params（请求参数）</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() =>
              updateRows((current) => [
                ...current,
                { key: "", mode: "field", staticValue: "", fieldPath: "", required: true },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            添加参数
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            例如 taskId、role、resourceType；静态值写 LABELER，动态值选表单字段。
          </p>
        ) : (
          rows.map((row, index) => (
            <div
              key={`param-row-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)_auto] items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700"
            >
              <TextFieldControl
                value={row.key}
                placeholder="参数名"
                onChange={(key) => {
                  updateRows((current) => {
                    const next = [...current];
                    next[index] = { ...current[index], key };
                    return next;
                  });
                }}
              />
              <SelectFieldControl
                label="绑定"
                value={row.mode}
                options={BINDING_MODE_OPTIONS}
                onChange={(mode) => {
                  updateRows((current) => {
                    const next = [...current];
                    next[index] = { ...current[index], mode: mode as ParamRow["mode"] };
                    return next;
                  });
                }}
              />
              {row.mode === "static" ? (
                row.key === "role" ? (
                  <SelectFieldControl
                    label="role"
                    value={row.staticValue}
                    options={ROLE_OPTIONS}
                    emptyLabel="选择角色"
                    onChange={(staticValue) => {
                      updateRows((current) => {
                        const next = [...current];
                        next[index] = { ...current[index], staticValue };
                        return next;
                      });
                    }}
                  />
                ) : (
                  <TextFieldControl
                    value={row.staticValue}
                    placeholder="静态值"
                    onChange={(staticValue) => {
                      updateRows((current) => {
                        const next = [...current];
                        next[index] = { ...current[index], staticValue };
                        return next;
                      });
                    }}
                  />
                )
              ) : (
                <SelectFieldControl
                  label="字段"
                  value={row.fieldPath}
                  options={fieldSelectOptions}
                  emptyLabel="选择字段"
                  onChange={(fieldPath) => {
                    updateRows((current) => {
                      const next = [...current];
                      next[index] = { ...current[index], fieldPath };
                      return next;
                    });
                  }}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-slate-400"
                onClick={() => updateRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
