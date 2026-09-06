"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import type { OptionItem } from "@/low-code/schema/types";
import type { ConditionFieldOption } from "./ConditionListEditor";
import { OptionMapParentField } from "./OptionMapParentField";

interface OptionMapEditorProps {
  dependsOn?: string;
  onDependsOnChange: (next: string | undefined) => void;
  fieldOptions: ConditionFieldOption[];
  fieldDefaultValues?: Record<string, unknown>;
  parentFieldLabel?: string;
  parentOptions: OptionItem[];
  value?: Record<string, OptionItem[]>;
  onChange: (next: Record<string, OptionItem[]> | undefined) => void;
}

function createChildOption(index: number): OptionItem {
  return {
    label: `选项 ${index + 1}`,
    value: `option_${index + 1}`,
  };
}

export function OptionMapEditor({
  dependsOn,
  onDependsOnChange,
  fieldOptions,
  fieldDefaultValues,
  parentFieldLabel,
  parentOptions,
  value,
  onChange,
}: OptionMapEditorProps) {
  const optionMap = value ?? {};

  const patchGroup = (parentValue: string, nextGroup: OptionItem[]) => {
    const nextMap: Record<string, OptionItem[]> = { ...optionMap };
    if (nextGroup.length === 0) {
      delete nextMap[parentValue];
    } else {
      nextMap[parentValue] = nextGroup;
    }
    onChange(Object.keys(nextMap).length ? nextMap : undefined);
  };

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">本地级联 optionMap</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          根据父字段静态值切换当前字段 options；与 remote.params 的远程级联不同。
        </p>
      </div>

      <OptionMapParentField
        value={dependsOn}
        fieldOptions={fieldOptions}
        fieldDefaultValues={fieldDefaultValues}
        onChange={onDependsOnChange}
      />

      {!dependsOn ? null : parentOptions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          父字段 {parentFieldLabel ? `「${parentFieldLabel}」` : ""} 暂无静态 options，当前无法配置 optionMap。
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            父字段 = {dependsOn}，按父值配置子选项：
          </p>
          {parentOptions.map((parentOption, groupIndex) => {
            const parentValue = String(parentOption.value);
            const children = optionMap[parentValue] ?? [];
            return (
              <div
                key={`${parentValue}-${groupIndex}`}
                className="space-y-2 rounded-lg border border-border bg-muted/80 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                      父值：{parentOption.label}
                    </p>
                    <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                      key = {parentValue}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => patchGroup(parentValue, [...children, createChildOption(children.length)])}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    添加子选项
                  </Button>
                </div>

                {children.length === 0 ? (
                  <p className="rounded border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    暂无子选项
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {children.map((childOption, childIndex) => (
                      <li key={`${parentValue}-${String(childOption.value)}-${childIndex}`} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            子选项 {childIndex + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600"
                            onClick={() =>
                              patchGroup(
                                parentValue,
                                children.filter((_, i) => i !== childIndex),
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <TextFieldControl
                          value={childOption.label}
                          placeholder="label"
                          onChange={(nextLabel) =>
                            patchGroup(
                              parentValue,
                              children.map((item, i) =>
                                i === childIndex ? { ...item, label: nextLabel } : item,
                              ),
                            )
                          }
                        />
                        <TextFieldControl
                          value={String(childOption.value)}
                          placeholder="value"
                          onChange={(nextValue) =>
                            patchGroup(
                              parentValue,
                              children.map((item, i) =>
                                i === childIndex ? { ...item, value: nextValue } : item,
                              ),
                            )
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
