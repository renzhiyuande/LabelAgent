"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import type { FieldOption } from "../../utils/field-options";

interface LlmApplyTargetsEditorProps {
  targets: string[];
  fieldOptions: FieldOption[];
  onChange: (next: string[]) => void;
}

function buildTargetOptions(fieldOptions: FieldOption[], selected: string[]) {
  const base = fieldOptions
    .filter((item) => item.value)
    .map((item) => ({
      value: item.value,
      label: item.label,
    }));
  for (const path of selected) {
    if (path && !base.some((item) => item.value === path)) {
      base.push({ value: path, label: `${path}（当前值）` });
    }
  }
  return base;
}

export function LlmApplyTargetsEditor({ targets, fieldOptions, onChange }: LlmApplyTargetsEditorProps) {
  const targetOptions = buildTargetOptions(fieldOptions, targets);

  function patchTarget(index: number, targetPath: string) {
    const next = targets.map((path, rowIndex) => (rowIndex === index ? targetPath : path));
    onChange(next);
  }

  function addRow() {
    const firstUnused = targetOptions.find((item) => !targets.includes(item.value))?.value ?? "";
    onChange([...targets, firstUnused]);
  }

  function removeRow(index: number) {
    onChange(targets.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-4 text-slate-500">
        选择 Agent 要自动填充的标注字段；JSON Schema 与输出键名由服务端根据字段 key 自动生成，无需手填 JSON 键。
      </p>
      {targets.length === 0 ? (
        <p className="text-xs text-slate-400">尚未选择字段，添加后启用「应用到标注」。</p>
      ) : null}
      {targetOptions.length === 0 ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          模板中暂无标注作答字段（importRole=input），请先在其它字段上配置「导入角色」为作答。
        </p>
      ) : null}
      {targets.map((targetPath, index) => (
        <div
          key={`${index}-${targetPath}`}
          className="flex gap-2 rounded-lg border border-slate-200 bg-white/80 p-2 dark:border-slate-700 dark:bg-slate-950/40"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <span className="text-[11px] text-slate-500">标注字段</span>
            <Combobox
              value={targetPath}
              options={targetOptions}
              placeholder="选择目标字段"
              emptyText="无可选标注字段"
              onValueChange={(next) => patchTarget(index, next)}
            />
          </div>
          <div className="flex items-end pb-0.5">
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeRow(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={addRow}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        添加字段
      </Button>
    </div>
  );
}
