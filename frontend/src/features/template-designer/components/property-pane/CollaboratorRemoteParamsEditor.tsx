"use client";

import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import type { RemoteOptionMeta, RemoteParamBinding } from "@/low-code/schema/types";
import type { ConditionFieldOption } from "./ConditionListEditor";
import {
  readCollaboratorRoleConfig,
  writeCollaboratorRoleConfig,
  type CollaboratorRoleMode,
} from "../../utils/option-source-profiles";

const ROLE_MODE_OPTIONS = [
  { label: "不限角色", value: "none" },
  { label: "固定角色", value: "static" },
  { label: "来自表单字段", value: "field" },
];

const ROLE_OPTIONS = [
  { label: "标注员 LABELER", value: "LABELER" },
  { label: "审核员 REVIEWER", value: "REVIEWER" },
  { label: "负责人 OWNER", value: "OWNER" },
];

interface CollaboratorRemoteParamsEditorProps {
  params?: Record<string, RemoteParamBinding>;
  fieldOptions: ConditionFieldOption[];
  onChange: (next: Pick<RemoteOptionMeta, "params">) => void;
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

export function CollaboratorRemoteParamsEditor({
  params,
  fieldOptions,
  onChange,
}: CollaboratorRemoteParamsEditorProps) {
  const config = readCollaboratorRoleConfig(params);
  const fieldSelectOptions = ensureCurrentFieldOption(fieldOptions, config.fieldPath);

  const patchConfig = (nextConfig: ReturnType<typeof readCollaboratorRoleConfig>) => {
    onChange({ params: writeCollaboratorRoleConfig(nextConfig) });
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div>
        <label className="text-xs font-medium text-slate-700 dark:text-slate-200">角色筛选</label>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          限制下拉只展示指定角色的协作用户；不选则展示当前用户可见的全部协作者。
        </p>
      </div>

      <SelectFieldControl
        label="角色来源"
        value={config.mode}
        options={ROLE_MODE_OPTIONS}
        onChange={(mode) => {
          const nextMode = mode as CollaboratorRoleMode;
          if (nextMode === "static") {
            patchConfig({ mode: "static", staticRole: config.staticRole ?? "LABELER" });
            return;
          }
          if (nextMode === "field") {
            patchConfig({ mode: "field", fieldPath: config.fieldPath ?? fieldOptions[0]?.value ?? "" });
            return;
          }
          patchConfig({ mode: "none" });
        }}
      />

      {config.mode === "static" ? (
        <SelectFieldControl
          label="固定角色"
          value={config.staticRole ?? "LABELER"}
          options={ROLE_OPTIONS}
          onChange={(staticRole) => patchConfig({ mode: "static", staticRole })}
        />
      ) : null}

      {config.mode === "field" ? (
        <SelectFieldControl
          label="角色字段"
          value={config.fieldPath ?? ""}
          options={fieldSelectOptions}
          emptyLabel="选择表单字段"
          onChange={(fieldPath) => patchConfig({ mode: "field", fieldPath })}
        />
      ) : null}
    </div>
  );
}
