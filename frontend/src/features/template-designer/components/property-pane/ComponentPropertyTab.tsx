"use client";

import { useMemo } from "react";
import type { FormFieldSchema } from "@/low-code/schema/types";
import { getPropsForComponent } from "../../constants/component-registry";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import { resolveConditionFieldPath } from "./condition-value";
import { buildDisplayFieldOptions, buildFieldOptions, buildInputFieldOptions } from "../../utils/field-options";
import { DefaultValueEditor } from "./DefaultValueEditor";
import { LlmMetaEditor } from "./LlmMetaEditor";
import { NestedFieldsEditor } from "./NestedFieldsEditor";
import { OptionMapEditor } from "./OptionMapEditor";
import { OptionsEditor } from "./OptionsEditor";
import { RemoteMetaEditor } from "./RemoteMetaEditor";
import { ShowItemMetaEditor } from "./ShowItemMetaEditor";
import { ShowAssetMetaEditor } from "./ShowAssetMetaEditor";
import { RichTextMetaEditor } from "./RichTextMetaEditor";
import { UploadMetaEditor } from "./UploadMetaEditor";

interface ComponentPropertyTabProps {
  field: FormFieldSchema;
}

export function ComponentPropertyTab({ field }: ComponentPropertyTabProps) {
  const updateField = useDesignerEditorStore((state) => state.updateField);
  const updateNestedField = useDesignerEditorStore((state) => state.updateNestedField);
  const getScopeFields = useDesignerEditorStore((state) => state.getScopeFields);
  const selectedParentKey = useDesignerEditorStore((state) => state.selectedParentKey);
  const formSchema = useDesignerEditorStore((state) => state.formSchema);
  const currentVersionId = useDesignerEditorStore((state) => state.currentVersionId);
  const props = getPropsForComponent(field.component);
  const scopeFields = getScopeFields();
  const fieldOptions = useMemo(
    () => buildFieldOptions(scopeFields, field.key),
    [scopeFields, field.key],
  );
  const llmPromptFieldOptions = useMemo(
    () => buildDisplayFieldOptions(formSchema, field.key),
    [formSchema, field.key],
  );
  const llmApplyFieldOptions = useMemo(
    () => buildInputFieldOptions(formSchema, field.key),
    [formSchema, field.key],
  );
  const dependsOnTargetField = useMemo(() => {
    if (!field.dependsOn) return undefined;
    return scopeFields.find((item) => {
      const itemPath = item.path ?? item.key;
      return itemPath === field.dependsOn || item.key === field.dependsOn;
    });
  }, [scopeFields, field.dependsOn]);
  const fieldDefaultValues = useMemo(
    () =>
      scopeFields.reduce<Record<string, unknown>>((accumulator, item) => {
        const path = item.path ?? item.key;
        accumulator[path] = item.defaultValue;
        return accumulator;
      }, {}),
    [scopeFields],
  );

  const patchField = (patch: Partial<FormFieldSchema>) => {
    if (selectedParentKey && field.key !== selectedParentKey) {
      updateNestedField(selectedParentKey, field.key, patch);
      return;
    }
    updateField(field.key, patch);
  };

  return (
    <div className="space-y-5 p-4">
      {props.includes("defaultValue") ? (
        <DefaultValueEditor
          component={field.component}
          value={field.defaultValue}
          field={field.component === "array" ? field : undefined}
          onChange={(next) => patchField({ defaultValue: next })}
        />
      ) : null}

      {props.includes("options") ? (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(next) => patchField({ options: next.length ? next : undefined })}
        />
      ) : null}

      {props.includes("remote") ? (
        <RemoteMetaEditor
          remote={field.remote}
          fieldOptions={fieldOptions}
          fieldDefaultValues={fieldDefaultValues}
          onChange={(next) => patchField({ remote: next })}
        />
      ) : null}

      {props.includes("optionMap") ? (
        <OptionMapEditor
          dependsOn={field.dependsOn}
          onDependsOnChange={(dependsOn) => patchField({ dependsOn })}
          fieldOptions={fieldOptions}
          fieldDefaultValues={fieldDefaultValues}
          parentFieldLabel={dependsOnTargetField?.label}
          parentOptions={dependsOnTargetField?.options ?? []}
          value={field.optionMap}
          onChange={(optionMap) => patchField({ optionMap })}
        />
      ) : null}

      {props.includes("richText") ? (
        <RichTextMetaEditor field={field} onChange={(patch) => patchField(patch)} />
      ) : null}

      {props.includes("upload") ? (
        <UploadMetaEditor
          title={
            field.component === "imageUpload"
              ? "图片上传配置"
              : field.component === "fileUpload"
                ? "文件上传配置"
                : "上传配置"
          }
          variant={field.component === "imageUpload" ? "image" : "file"}
          value={field.upload}
          onChange={(upload) => patchField({ upload })}
        />
      ) : null}

      {props.includes("llm") ? (
        <LlmMetaEditor
          llm={field.llm}
          fieldCode={field.key}
          templateVersionId={currentVersionId}
          fieldOptions={llmPromptFieldOptions}
          applyFieldOptions={llmApplyFieldOptions}
          onChange={(llm) => patchField({ llm })}
        />
      ) : null}

      {props.includes("display") ? (
        <ShowItemMetaEditor field={field} onChange={(patch) => patchField(patch)} />
      ) : null}

      {props.includes("showImage") ? (
        <ShowAssetMetaEditor variant="showImage" field={field} onChange={(patch) => patchField(patch)} />
      ) : null}

      {props.includes("showFile") ? (
        <ShowAssetMetaEditor variant="showFile" field={field} onChange={(patch) => patchField(patch)} />
      ) : null}

      {props.includes("showVideo") ? (
        <ShowAssetMetaEditor variant="showVideo" field={field} onChange={(patch) => patchField(patch)} />
      ) : null}

      {props.includes("fields") ? (
        <NestedFieldsEditor parentField={field} />
      ) : null}
    </div>
  );
}
