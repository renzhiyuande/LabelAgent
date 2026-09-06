"use client";

import { TextFieldControl } from "@/low-code/components/fields/controls/TextFieldControl";
import { SelectFieldControl } from "@/low-code/components/fields/controls/SelectFieldControl";
import { SwitchFieldControl } from "@/low-code/components/fields/controls/SwitchFieldControl";
import type { FormFieldComponent, FormFieldSchema } from "@/low-code/schema/types";
import type { ImportFieldRole } from "@/low-code/schema/types";
import { ALL_COMPONENTS } from "../../constants/component-registry";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import { isRuntimeImportField, withImportFieldMeta } from "@/low-code/schema/import-field-meta";

interface BasicPropertyTabProps {
  field: FormFieldSchema;
}

export function BasicPropertyTab({ field }: BasicPropertyTabProps) {
  const updateField = useDesignerEditorStore((state) => state.updateField);
  const updateNestedField = useDesignerEditorStore((state) => state.updateNestedField);
  const changeFieldComponent = useDesignerEditorStore((state) => state.changeFieldComponent);
  const selectedParentKey = useDesignerEditorStore((state) => state.selectedParentKey);
  const componentOptions = ALL_COMPONENTS.map((item) => ({
    label: item.label,
    value: item.value,
  }));
  const isShowItem = field.component === "showItem";
  const isShowImage = field.component === "showImage";
  const isShowFile = field.component === "showFile";
  const isShowVideo = field.component === "showVideo";
  const isLlmSuggest = field.component === "llmSuggest";
  const isDisplayOnly = isShowItem || isShowImage || isShowFile || isShowVideo || isLlmSuggest;
  const importContract = useDesignerEditorStore((state) => state.importContract);
  const lockedKeys = importContract?.requiredKeys ?? [];
  const binding = field.path ?? field.key;
  const isShowAsset = isShowImage || isShowFile || isShowVideo;
  const isLockedBinding = !isShowItem && !isShowAsset && lockedKeys.includes(binding);
  const patchField = (patch: Partial<FormFieldSchema>) => {
    if (selectedParentKey && field.key !== selectedParentKey) {
      updateNestedField(selectedParentKey, field.key, patch);
      return;
    }
    updateField(field.key, patch);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="lh-designer-pane-label">字段标题</label>
        <TextFieldControl
          value={field.label}
          onChange={(value) => patchField({ label: value })}
        />
      </div>

      <div className="space-y-2">
        <label className="lh-designer-pane-label">字段 key</label>
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {field.key}
        </p>
      </div>

      {!isShowItem && !isShowAsset ? (
        <div className="space-y-2">
          <label className="lh-designer-pane-label">path</label>
          <TextFieldControl
            value={binding}
            disabled={isLockedBinding}
            onChange={(value) => patchField({ path: value })}
          />
          <p className="lh-designer-pane-hint">
            {isLockedBinding
              ? `该列「${binding}」已被任务导入契约锁定，不可改名。`
              : "与 payload / 表单值绑定的路径；展示项请在「组件」Tab 配置绑定。"}
          </p>
        </div>
      ) : null}

      {!isShowItem && !isShowAsset ? (
        <div className="space-y-2">
          <label className="lh-designer-pane-label">导入角色</label>
          <SelectFieldControl
            label="导入角色"
            value={field.meta?.importRole ?? (field.readonly ? "display" : "input")}
            options={[
              { label: "展示（题目数据，导入必填）", value: "display" },
              { label: "输入（标注/预填，导入可选）", value: "input" },
              { label: "运行时（LLM 等，不参与导入）", value: "runtime" },
            ]}
            onChange={(value) => {
              const role = value as ImportFieldRole;
              const next = withImportFieldMeta(field, role);
              patchField(next);
            }}
          />
          {isRuntimeImportField(field) ? (
            <p className="lh-designer-pane-warning">
              运行时字段不会要求导入文件包含同名列。
            </p>
          ) : null}
        </div>
      ) : isShowAsset ? (
        <p className="lh-designer-pane-hint">
          展示图片/文件的数据来源与绑定请在「组件」Tab 配置。
        </p>
      ) : (
        <p className="lh-designer-pane-hint">
          展示项的数据来源与绑定列请在「组件」Tab 配置；导入后仍可修改渲染方式与布局。
        </p>
      )}

      <div className="space-y-2">
        <label className="lh-designer-pane-label">组件类型</label>
        <SelectFieldControl
          label="组件类型"
          value={field.component}
          options={componentOptions}
          onChange={(value) => changeFieldComponent(field.key, value as FormFieldComponent, selectedParentKey)}
        />
      </div>

      {!isDisplayOnly ? (
        <div className="space-y-2">
          <label className="lh-designer-pane-label">占位符</label>
          <TextFieldControl
            value={field.placeholder ?? ""}
            placeholder="请输入占位符"
            onChange={(value) => patchField({ placeholder: value })}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="lh-designer-pane-label">字段描述</label>
        <TextFieldControl
          value={field.description ?? ""}
          onChange={(value) => patchField({ description: value })}
        />
      </div>

      <div className="space-y-2">
        <label className="lh-designer-pane-label">栅格 span</label>
        <SelectFieldControl
          label="栅格 span"
          value={field.span ?? 24}
          options={[
            { label: "12（半宽）", value: 12 },
            { label: "24（整行）", value: 24 },
          ]}
          onChange={(value) => patchField({ span: value === "12" ? 12 : 24 })}
        />
      </div>

      {!isDisplayOnly ? (
        <div className="space-y-2">
          <label className="lh-designer-pane-label">必填</label>
          <SwitchFieldControl
            value={field.required ?? false}
            onChange={(value) => patchField({ required: value })}
          />
        </div>
      ) : null}

      {!isDisplayOnly ? (
        <div className="space-y-2">
          <label className="lh-designer-pane-label">只读</label>
          <SwitchFieldControl
            value={field.readonly ?? false}
            onChange={(value) => patchField({ readonly: value })}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="lh-designer-pane-label">隐藏</label>
        <SwitchFieldControl
          value={field.hidden ?? false}
          onChange={(value) => patchField({ hidden: value })}
        />
      </div>
    </div>
  );
}
