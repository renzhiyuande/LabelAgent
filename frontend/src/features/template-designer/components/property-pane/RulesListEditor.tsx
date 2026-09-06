"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import type { ValidationRuleMeta } from "@/low-code/schema/types";

interface RulesListEditorProps {
  rules: ValidationRuleMeta[];
  onChange: (rules: ValidationRuleMeta[]) => void;
}

const RULE_TYPE_OPTIONS: Array<{ label: string; value: ValidationRuleMeta["type"] }> = [
  { label: "required（必填）", value: "required" },
  { label: "minLength（最小长度）", value: "minLength" },
  { label: "maxLength（最大长度）", value: "maxLength" },
  { label: "min（最小值）", value: "min" },
  { label: "max（最大值）", value: "max" },
  { label: "pattern（正则）", value: "pattern" },
  { label: "email（邮箱）", value: "email" },
  { label: "phone（手机号）", value: "phone" },
];

function needsValue(type: ValidationRuleMeta["type"]): boolean {
  return ["minLength", "maxLength", "min", "max", "pattern"].includes(type);
}

function defaultMessage(type: ValidationRuleMeta["type"]): string {
  switch (type) {
    case "required":
      return "此项为必填";
    case "minLength":
      return "长度低于最小限制";
    case "maxLength":
      return "长度超过最大限制";
    case "min":
      return "数值低于最小限制";
    case "max":
      return "数值超过最大限制";
    case "pattern":
      return "格式不正确";
    case "email":
      return "邮箱格式不正确";
    case "phone":
      return "手机号格式不正确";
    default:
      return "校验失败";
  }
}

function defaultValue(type: ValidationRuleMeta["type"]): number | string | undefined {
  switch (type) {
    case "minLength":
    case "min":
      return 1;
    case "maxLength":
    case "max":
      return 100;
    case "pattern":
      return "";
    default:
      return undefined;
  }
}

function createRule(type: ValidationRuleMeta["type"]): ValidationRuleMeta {
  return {
    type,
    value: defaultValue(type),
    message: defaultMessage(type),
  };
}

export function RulesListEditor({ rules, onChange }: RulesListEditorProps) {
  const updateAt = (index: number, patch: Partial<ValidationRuleMeta>) => {
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const removeAt = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...rules, createRule("required")]);
  };

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">校验规则</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          对应 ValidationRuleMeta，提交时会按顺序执行校验。
        </p>
      </div>

      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          暂无校验规则
        </p>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule, index) => {
            const type = rule.type;
            return (
              <li
                key={`${rule.type}-${index}`}
                className="space-y-2 rounded-lg border border-border bg-muted/80 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">规则 {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600"
                    onClick={() => removeAt(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 dark:text-slate-300">type</label>
                  <SelectFieldControl
                    label="规则类型"
                    value={type}
                    options={RULE_TYPE_OPTIONS}
                    onChange={(next) => {
                      const nextType = next as ValidationRuleMeta["type"];
                      updateAt(index, {
                        type: nextType,
                        value: defaultValue(nextType),
                        message: defaultMessage(nextType),
                      });
                    }}
                  />
                </div>

                {needsValue(type) ? (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-600 dark:text-slate-300">value</label>
                    <TextFieldControl
                      value={String(rule.value ?? "")}
                      placeholder={type === "pattern" ? "请输入正则表达式" : "请输入数值"}
                      inputType={type === "pattern" ? "text" : "number"}
                      onChange={(value) =>
                        updateAt(index, {
                          value: type === "pattern" ? value : Number(value || 0),
                        })
                      }
                    />
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 dark:text-slate-300">message</label>
                  <TextFieldControl
                    value={rule.message}
                    placeholder="校验失败提示"
                    onChange={(message) => updateAt(index, { message })}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        添加规则
      </Button>
    </section>
  );
}
