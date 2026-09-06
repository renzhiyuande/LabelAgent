"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ConditionMeta, ConditionOperator } from "@/low-code/schema/types";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import { Button } from "@/components/ui/button";
import {
  CONDITION_OPERATORS,
  formatConditionValue,
  isArrayOperator,
  parseConditionValue,
} from "./condition-value";

export interface ConditionFieldOption {
  value: string;
  label: string;
}

interface ConditionListEditorProps {
  title: string;
  description: string;
  conditions: ConditionMeta[];
  fieldOptions: ConditionFieldOption[];
  onChange: (conditions: ConditionMeta[]) => void;
}

function createEmptyCondition(fieldOptions: ConditionFieldOption[]): ConditionMeta {
  const first = fieldOptions[0]?.value ?? "";
  return {
    field: first,
    operator: "eq",
    value: "",
  };
}

export function ConditionListEditor({
  title,
  description,
  conditions,
  fieldOptions,
  onChange,
}: ConditionListEditorProps) {
  const updateAt = (index: number, patch: Partial<ConditionMeta>) => {
    const next = conditions.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...conditions, createEmptyCondition(fieldOptions)]);
  };

  return (
    <section className="space-y-3">
      <div>
        <h4 className="lh-designer-pane-title">{title}</h4>
        <p className="lh-designer-pane-hint mt-1">{description}</p>
        <p className="lh-designer-pane-hint-subtle">
          多条规则为「且」关系，需全部满足才生效（与 LHResourceForm 一致）。
        </p>
      </div>

      {conditions.length === 0 ? (
        <p className="lh-designer-pane-empty">未配置条件</p>
      ) : (
        <ul className="space-y-3">
          {conditions.map((condition, index) => {
            const operator = (condition.operator ?? "eq") as ConditionOperator;
            const valueHint = isArrayOperator(operator)
              ? 'JSON 数组或逗号分隔，如 ["DRAFT","ACTIVE"] 或 DRAFT,ACTIVE'
              : "支持文本、true/false、数字";

            return (
              <li
                key={`${condition.field}-${index}`}
                className="space-y-2 rounded-lg border border-border bg-muted/80 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="lh-designer-pane-rule-index">规则 {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive/90"
                    onClick={() => removeAt(index)}
                    aria-label="删除条件"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <label className="lh-designer-pane-field-label">依赖字段</label>
                  {fieldOptions.length > 0 ? (
                    <SelectFieldControl
                      label="依赖字段"
                      value={condition.field}
                      options={fieldOptions.map((opt) => ({
                        label: opt.label,
                        value: opt.value,
                      }))}
                      onChange={(value) => updateAt(index, { field: value })}
                    />
                  ) : (
                    <TextFieldControl
                      value={condition.field}
                      placeholder="字段 path 或 key"
                      onChange={(value) => updateAt(index, { field: value })}
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="lh-designer-pane-field-label">运算符</label>
                  <SelectFieldControl
                    label="运算符"
                    value={operator}
                    options={CONDITION_OPERATORS.map((item) => ({
                      label: item.label,
                      value: item.value,
                    }))}
                    emptyLabel="选择运算符"
                    onChange={(value) => {
                      const nextOperator = value as ConditionOperator;
                      const nextValue = isArrayOperator(nextOperator)
                        ? Array.isArray(condition.value)
                          ? condition.value
                          : condition.value != null && condition.value !== ""
                            ? [condition.value]
                            : []
                        : Array.isArray(condition.value)
                          ? String(condition.value[0] ?? "")
                          : condition.value;
                      updateAt(index, { operator: nextOperator, value: nextValue });
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="lh-designer-pane-field-label">比较值</label>
                  <TextFieldControl
                    value={formatConditionValue(condition.value, operator)}
                    placeholder={valueHint}
                    onChange={(raw) =>
                      updateAt(index, {
                        value: parseConditionValue(raw, operator),
                      })
                    }
                  />
                  <p className="lh-designer-pane-value-hint">{valueHint}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAdd}
        disabled={fieldOptions.length === 0}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        添加条件
      </Button>

      {fieldOptions.length === 0 ? (
        <p className="lh-designer-pane-warning">
          当前区块没有其他字段，请先在画布添加依赖字段后再配置联动。
        </p>
      ) : null}
    </section>
  );
}
