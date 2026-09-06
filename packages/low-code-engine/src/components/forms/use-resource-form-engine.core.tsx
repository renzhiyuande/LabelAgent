"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import type { AuthenticatedUser } from "../../lib/types";
import type { FormFieldSchema, FormSchema, OptionItem, RemoteOptionQuery, ResourceMeta } from "../../schema/types";
import { normalizeSnowflakeId } from "../../lib/id-utils";
import { getValueAtPath, setValueAtPath } from "../../utils/object-path";
import { hasPermission } from "../../utils/permissions";
import { isFormFieldDisabled, isFormFieldVisible } from "../../utils/form-field-mode";
import { resolveAssignmentApis } from "../../utils/build-assignment-form";
import type { TreeOptionNode } from "../../adapters/tree-options";
import {
  buildRemoteSchemaRequestKey,
  clearRemoteSchemaCache,
  fetchEngineTreeOptions,
  fetchRemoteOptionsWithSelectedValue,
  fetchRemoteSchema,
  fetchRemoteTreeSelectOptionsWithSelectedValue,
} from "../../adapters/request";
import { SharedField } from "../fields/SharedField";
import { FieldControlRenderer } from "../fields/FieldControlRenderer";
import { ArrayTableFieldControl } from "../fields/controls/ArrayTableFieldControl";
import { DynamicTableFieldControl } from "../fields/controls/DynamicTableFieldControl";
import type { BaseFieldViewModel } from "../fields/types";
import { AssignmentPickerFieldControl } from "../fields/controls/AssignmentPickerFieldControl";
import { toFormFieldViewModel } from "../fields/adapters/form-field";
import type { ActionSchema, TableColumnSchema } from "../../schema/types";
import type { ResourceRecord } from "../../types";
import { collectResourceFormValidationErrors } from "./resource-form-validation";
import { collectSectionDefaults, mergeFormValues } from "../../utils/form-values";
import { normalizeRemoteSchema } from "../../utils/remote-schema";
import { buildFormRemoteOptionQuery } from "../../utils/detail-field-options";
import {
  collectRemoteParamSourcePaths,
  isRemoteOptionQueryReady,
} from "../../utils/remote-option-query";

const EMPTY_REMOTE_SCHEMA: FormSchema = {
  sections: [],
  actions: [],
};

function usesRemoteOptionSource(field: FormFieldSchema): boolean {
  if (!field.remote?.source || field.component === "remoteTreeSelect" || field.component === "treeMultiSelect") {
    return false;
  }
  return (
    field.component === "remoteSelect"
    || field.component === "user"
    || field.component === "multiSelect"
    || field.component === "tags"
    || (field.remote.source === "collaborators"
      && (field.component === "textarea" || field.component === "text"))
  );
}

function usesRemoteTreeMultiSelectSource(field: FormFieldSchema): boolean {
  return Boolean(field.remote?.source && field.component === "treeMultiSelect");
}

function usesRemoteDependsOn(field: FormFieldSchema): boolean {
  if (!usesRemoteOptionSource(field) && !usesRemoteTreeMultiSelectSource(field)) {
    return false;
  }
  return collectRemoteParamSourcePaths(field.remote).length > 0;
}

export interface ResourceFormContext {
  recordId?: string | number;
  /** 模板版本 ID，供 llmSuggest 解析版本级 provider/model */
  templateVersionId?: string | number;
  assignmentId?: string | number;
  submissionId?: string | number;
  taskId?: string | number;
  /** 设计器预览样本题目 ID，供 llmSuggest preview 接口加载题面 */
  taskItemId?: string | number;
  /** 当前题目 payload，供 llmSuggest 注入题面上下文 */
  itemPayload?: Record<string, unknown>;
  /** 题目展示区 schema，供 llmSuggest 自动拼接题面字段 */
  displaySchema?: import("../../schema/types").FormSchema;
  /** 标注工作台：当前提交是否允许调用 LLM 建议（不可编辑时为 false） */
  llmSuggestInvokeAllowed?: boolean;
  assignmentAction?: ActionSchema;
  scope?: { field: string; value: string | number };
  onTableAction?: (event: {
    action: string;
    record: ResourceRecord;
    field: FormFieldSchema;
    column?: TableColumnSchema;
  }) => void;
}

export interface UseResourceFormEngineOptions {
  resource: ResourceMeta;
  mode: "create" | "edit" | "assignment";
  values: Record<string, unknown>;
  currentUser?: AuthenticatedUser | null;
  onChange: (key: string, value: unknown) => void;
  onSubmit: () => Promise<void>;
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
  formContext?: ResourceFormContext;
  fieldErrors?: Record<string, string>;
  onFieldErrorsChange?: (errors: Record<string, string>) => void;
}

export function useResourceFormEngine({
  resource,
  mode,
  values,
  currentUser = null,
  onChange,
  onSubmit,
  loadRemoteOptions,
  formContext,
  fieldErrors: controlledFieldErrors,
  onFieldErrorsChange,
}: UseResourceFormEngineOptions) {
  const assignmentApis = formContext?.assignmentAction ? resolveAssignmentApis(formContext.assignmentAction) : null;
  const [remoteOptions, setRemoteOptions] = useState<Record<string, OptionItem[]>>({});
  const [remoteTreeOptions, setRemoteTreeOptions] = useState<Record<string, TreeOptionNode[]>>({});
  const [remoteSchemas, setRemoteSchemas] = useState<Record<string, { schema: FormSchema; loading: boolean; error?: string }>>({});
  const [remoteKeywords, setRemoteKeywords] = useState<Record<string, string>>({});
  const [internalFieldErrors, setInternalFieldErrors] = useState<Record<string, string>>({});
  const fieldErrors = controlledFieldErrors ?? internalFieldErrors;
  const remoteSchemaDependsOnRef = useRef<Record<string, string>>({});
  const loadRemoteOptionsRef = useRef(loadRemoteOptions);
  loadRemoteOptionsRef.current = loadRemoteOptions;
  const remoteSchemaSignatureRef = useRef<Record<string, string>>({});
  const valuesRef = useRef(values);
  const onChangeRef = useRef(onChange);
  const hasLoadingRemoteSchemas = useMemo(
    () => Object.values(remoteSchemas).some((state) => state.loading),
    [remoteSchemas],
  );
  const hasFailedRemoteSchemas = useMemo(
    () => Object.values(remoteSchemas).some((state) => !state.loading && Boolean(state.error)),
    [remoteSchemas],
  );

  function applyFieldErrors(nextErrors: Record<string, string>) {
    if (onFieldErrorsChange) {
      onFieldErrorsChange(nextErrors);
      return;
    }
    setInternalFieldErrors(nextErrors);
  }

  function clearFieldError(path: string) {
    if (!(path in fieldErrors)) {
      return;
    }
    const next = { ...fieldErrors };
    delete next[path];
    applyFieldErrors(next);
  }

  const introText = useMemo(() => {
    if (resource.form.title) {
      return resource.form.title;
    }
    if (mode === "assignment" || mode === "create") {
      return "";
    }
    return "";
  }, [mode, resource]);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (onFieldErrorsChange) {
      onFieldErrorsChange({});
    } else {
      setInternalFieldErrors({});
    }
  }, [onFieldErrorsChange, resource, mode]);

  useEffect(() => {
    clearRemoteSchemaCache();
    setRemoteSchemas({});
    remoteSchemaDependsOnRef.current = {};
    remoteSchemaSignatureRef.current = {};
  }, [resource, mode]);

  const remoteParamFields = useMemo(() => {
    return resource.form.sections
      .flatMap((section) => section.fields)
      .filter((field) => usesRemoteDependsOn(field))
      .map((field) => ({
        key: field.key,
        paths: collectRemoteParamSourcePaths(field.remote),
      }));
  }, [resource]);

  const remoteParamValuesSignature = useMemo(() => {
    return remoteParamFields.reduce<Record<string, string>>((acc, { key, paths }) => {
      acc[key] = paths.map((path) => String(getValueAtPath(values, path) ?? "")).join("|");
      return acc;
    }, {});
  }, [remoteParamFields, values]);

  function buildFieldRemoteOptionQuery(field: FormFieldSchema): RemoteOptionQuery {
    return buildFormRemoteOptionQuery(field.remote, {
      values,
      searchText: remoteKeywords[field.key],
    });
  }

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      const remoteFields = resource.form.sections.flatMap((section) =>
        section.fields.filter(
          (field) => hasPermission(currentUser, field.permission) && isFormFieldVisible(field, mode, values),
        ),
      );
      const flatEntries = await Promise.all([
        ...remoteFields
          .filter((field) => usesRemoteOptionSource(field))
          .map(async (field) => {
            if (!isRemoteOptionQueryReady(field.remote, values)) {
              return [field.key, []] as const;
            }
            const path = field.path ?? field.key;
            const selectedValue = getValueAtPath(values, path);
            if (field.component === "remoteSelect" || field.component === "user") {
              return [
                field.key,
                await fetchRemoteOptionsWithSelectedValue(
                  resource,
                  field.remote!.source,
                  buildFieldRemoteOptionQuery(field),
                  selectedValue,
                ),
              ] as const;
            }
            return [
              field.key,
              await loadRemoteOptionsRef.current(field.remote!.source, buildFieldRemoteOptionQuery(field)),
            ] as const;
          }),
        ...remoteFields
          .filter((field) => field.dict)
          .map(async (field) => [field.key, await loadRemoteOptionsRef.current(`dict:${field.dict}`, undefined)] as const),
      ]);
      const treeEntries = await Promise.all([
        ...remoteFields
          .filter((field) => field.remote?.source && field.component === "remoteTreeSelect")
          .map(async (field) => {
            const path = field.path ?? field.key;
            const selectedValue = getValueAtPath(values, path);
            return [
              field.key,
              await fetchRemoteTreeSelectOptionsWithSelectedValue(
                resource,
                field.remote!,
                remoteKeywords[field.key],
                selectedValue,
              ),
            ] as const;
          }),
        ...remoteFields
          .filter((field) => usesRemoteTreeMultiSelectSource(field))
          .map(async (field) => {
            if (!isRemoteOptionQueryReady(field.remote, values)) {
              return [field.key, []] as const;
            }
            return [
              field.key,
              await fetchEngineTreeOptions(resource, field.remote!.source, buildFieldRemoteOptionQuery(field)),
            ] as const;
          }),
      ]);

      if (active) {
        setRemoteOptions(Object.fromEntries(flatEntries));
        setRemoteTreeOptions(Object.fromEntries(treeEntries));
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, [currentUser, mode, remoteKeywords, resource, remoteParamValuesSignature, values]);

  const remoteSchemaFields = useMemo(
    () =>
      resource.form.sections.flatMap((section) =>
        section.fields.filter(
          (field) =>
            field.component === "remoteSchema" && field.remoteSchema?.api && hasPermission(currentUser, field.permission),
        ),
      ),
    [currentUser, resource],
  );

  const remoteSchemaDependsKeys = useMemo(() => {
    return remoteSchemaFields.reduce<Record<string, string>>((acc, field) => {
      const dependsOn = field.remoteSchema?.dependsOn;
      acc[field.key] = dependsOn ? String(getValueAtPath(values, dependsOn) ?? "").trim() : "";
      return acc;
    }, {});
  }, [remoteSchemaFields, values]);

  const remoteSchemaRequestKeys = useMemo(() => {
    return remoteSchemaFields.reduce<Record<string, string>>((acc, field) => {
      const remoteSchema = field.remoteSchema;
      if (!remoteSchema) {
        return acc;
      }
      if (remoteSchema.dependsOn && !remoteSchemaDependsKeys[field.key]) {
        acc[field.key] = "";
        return acc;
      }
      acc[field.key] = buildRemoteSchemaRequestKey(remoteSchema, values);
      return acc;
    }, {});
  }, [remoteSchemaDependsKeys, remoteSchemaFields, values]);

  const remoteSchemaFetchSignature = useMemo(() => {
    return remoteSchemaFields
      .map((field) => `${field.key}:${remoteSchemaRequestKeys[field.key] ?? ""}`)
      .join("|");
  }, [remoteSchemaFields, remoteSchemaRequestKeys]);

  useEffect(() => {
    let active = true;

    async function loadRemoteSchemas() {

      for (const field of remoteSchemaFields) {
        const remoteSchema = field.remoteSchema;
        if (!remoteSchema) {
          continue;
        }
        const path = field.path ?? field.key;
        const dependsKey = remoteSchemaDependsKeys[field.key] ?? "";
        const signature = remoteSchemaRequestKeys[field.key] ?? "";

        if (remoteSchema.dependsOn && !dependsKey) {
          if (!active) {
            return;
          }
          remoteSchemaSignatureRef.current[field.key] = "";
          setRemoteSchemas((current) => ({
            ...current,
            [field.key]: { schema: EMPTY_REMOTE_SCHEMA, loading: false },
          }));
          continue;
        }

        if (remoteSchemaSignatureRef.current[field.key] === signature) {
          continue;
        }

        setRemoteSchemas((current) => ({
          ...current,
          [field.key]: {
            schema: current[field.key]?.schema ?? EMPTY_REMOTE_SCHEMA,
            loading: true,
          },
        }));

        try {
          const schema = await fetchRemoteSchema(remoteSchema, valuesRef.current);
          if (!active) {
            return;
          }
          const normalizedSchema = normalizeRemoteSchema(schema);
          const defaults = collectSectionDefaults(normalizedSchema.sections);
          const previousDepends = remoteSchemaDependsOnRef.current[field.key];
          const dependsChanged = remoteSchema.dependsOn !== undefined && previousDepends !== undefined && previousDepends !== dependsKey;
          const latestValues = valuesRef.current;
          const currentValue = getValueAtPath(latestValues, path);
          const currentObject =
            currentValue && typeof currentValue === "object" && !Array.isArray(currentValue)
              ? (currentValue as Record<string, unknown>)
              : {};
          const nextValue =
            dependsChanged && remoteSchema.clearOnDependsChange !== false
              ? defaults
              : mergeFormValues(defaults, currentObject);

          if (JSON.stringify(currentObject) !== JSON.stringify(nextValue)) {
            onChangeRef.current(path, nextValue);
          }

          remoteSchemaDependsOnRef.current[field.key] = dependsKey;
          remoteSchemaSignatureRef.current[field.key] = signature;
          setRemoteSchemas((current) => ({
            ...current,
            [field.key]: {
              schema: normalizedSchema,
              loading: false,
            },
          }));
        } catch (error) {
          if (!active) {
            return;
          }
          remoteSchemaSignatureRef.current[field.key] = "";
          setRemoteSchemas((current) => ({
            ...current,
            [field.key]: {
              schema: EMPTY_REMOTE_SCHEMA,
              loading: false,
              error: error instanceof Error ? error.message : "远程 schema 加载失败",
            },
          }));
        }
      }
    }

    void loadRemoteSchemas();

    return () => {
      active = false;
    };
  }, [remoteSchemaDependsKeys, remoteSchemaFetchSignature, remoteSchemaFields, remoteSchemaRequestKeys]);

  function resolveFieldOptions(field: FormFieldSchema): OptionItem[] {
    if (field.dict && remoteOptions[field.key]) {
      return remoteOptions[field.key];
    }
    if (field.optionMap && field.dependsOn) {
      const dependencyValue = getValueAtPath(values, field.dependsOn);
      return field.optionMap[String(dependencyValue ?? "")] ?? [];
    }
    if (field.optionsFrom) {
      const sourceValue = getValueAtPath(values, field.optionsFrom);
      return Array.isArray(sourceValue)
        ? sourceValue.filter((item): item is OptionItem => {
            return Boolean(item) && typeof item === "object" && "label" in item && "value" in item;
          })
        : [];
    }
    return field.options ?? [];
  }

  function updateFieldValue(path: string, nextValue: unknown) {
    clearFieldError(path);
    onChange(path, nextValue);
  }

  function updateUserFieldValue(field: FormFieldSchema, path: string, nextValue: unknown) {
    updateFieldValue(path, nextValue);
    if (field.component !== "user") {
      return;
    }
    const nameField = field.user?.nameField;
    if (!nameField) {
      return;
    }
    const selectedId = normalizeSnowflakeId(nextValue);
    if (!selectedId) {
      updateFieldValue(nameField, "");
      return;
    }
    const matched = (remoteOptions[field.key] ?? []).find(
      (option) => (normalizeSnowflakeId(option.value) ?? String(option.value)) === selectedId,
    );
    updateFieldValue(nameField, matched?.label?.trim() ?? "");
  }

  function collectLoadingRemoteSchemaErrors(): Record<string, string> {
    const nextErrors: Record<string, string> = {};

    function visitFields(fields: FormFieldSchema[], parentPath?: string) {
      for (const field of fields) {
        const path = parentPath ? `${parentPath}.${field.path ?? field.key}` : field.path ?? field.key;
        if (field.component === "remoteSchema" && remoteSchemas[field.key]?.loading) {
          nextErrors[path] = "配置表单加载中，请稍后再试";
        }
        if (field.fields?.length) {
          visitFields(field.fields, path);
        }
      }
    }

    resource.form.sections.forEach((section) => visitFields(section.fields));
    return nextErrors;
  }

  function collectFailedRemoteSchemaErrors(): Record<string, string> {
    const nextErrors: Record<string, string> = {};

    function visitFields(fields: FormFieldSchema[], parentPath?: string) {
      for (const field of fields) {
        const path = parentPath ? `${parentPath}.${field.path ?? field.key}` : field.path ?? field.key;
        const remoteSchemaState = remoteSchemas[field.key];
        if (field.component === "remoteSchema" && remoteSchemaState?.error) {
          nextErrors[path] = "配置表单加载失败，请稍后重试";
        }
        if (field.fields?.length) {
          visitFields(field.fields, path);
        }
      }
    }

    resource.form.sections.forEach((section) => visitFields(section.fields));
    return nextErrors;
  }

  function collectValidationErrors(): Record<string, string> {
    const remoteSchemaFields = Object.fromEntries(
      Object.entries(remoteSchemas)
        .filter(([, state]) => !state.loading && !state.error)
        .map(([key, state]) => [key, state.schema.sections.flatMap((section) => section.fields)]),
    );
    return {
      ...collectResourceFormValidationErrors(resource, values, remoteSchemaFields, currentUser, mode),
      ...(hasLoadingRemoteSchemas ? collectLoadingRemoteSchemaErrors() : {}),
      ...(hasFailedRemoteSchemas ? collectFailedRemoteSchemaErrors() : {}),
    };
  }

  function resolveUserDisplayName(field: FormFieldSchema): string | null {
    if (field.component !== "user") {
      return null;
    }
    const nameField = field.user?.nameField;
    if (!nameField) {
      return null;
    }
    const raw = getValueAtPath(values, nameField);
    if (raw == null || raw === "") {
      return null;
    }
    return String(raw);
  }

  function renderSharedFormField(
    field: FormFieldSchema,
    value: unknown,
    disabled: boolean,
    path: string,
    elementKey: string,
    className: string,
  ) {
    const usesRemoteOptions = usesRemoteOptionSource(field);
    const options = usesRemoteOptions ? (remoteOptions[field.key] ?? []) : resolveFieldOptions(field);
    const treeOptions =
      field.component === "remoteTreeSelect" || field.component === "treeMultiSelect"
        ? (remoteTreeOptions[field.key] ?? [])
        : undefined;
    const model: BaseFieldViewModel = {
      ...toFormFieldViewModel({
        field,
        value,
        disabled,
        error: fieldErrors[path],
        options,
        treeOptions,
        searchValue: remoteKeywords[field.key] ?? "",
      }),
      formValues:
        field.component === "llmSuggest" ||
        field.component === "showItem" ||
        field.component === "showImage" ||
        field.component === "showFile" ||
        field.component === "showVideo" ||
        field.component === "dictTagPreview" ||
        field.component === "dictTagClassName"
          ? values
          : undefined,
      templateVersionId:
        field.component === "llmSuggest" ? formContext?.templateVersionId : undefined,
      fieldCode: field.component === "llmSuggest" ? path : undefined,
      assignmentId: field.component === "llmSuggest" ? formContext?.assignmentId : undefined,
      submissionId: field.component === "llmSuggest" ? formContext?.submissionId : undefined,
      taskId: field.component === "llmSuggest" ? formContext?.taskId : undefined,
      taskItemId: field.component === "llmSuggest" ? formContext?.taskItemId : undefined,
      itemPayload: field.component === "llmSuggest" ? formContext?.itemPayload : undefined,
      displaySchema: field.component === "llmSuggest" ? formContext?.displaySchema : undefined,
      llmSuggestInvokeAllowed:
        field.component === "llmSuggest" ? formContext?.llmSuggestInvokeAllowed : undefined,
      userDisplayName: resolveUserDisplayName(field),
    };

    return (
      <SharedField
        key={elementKey}
        model={model}
        className={className}
        handlers={{
          onChange: (nextValue) =>
            field.component === "user"
              ? updateUserFieldValue(field, path, nextValue)
              : updateFieldValue(path, nextValue),
          onApplyFieldValues:
            field.component === "llmSuggest"
              ? (updates) => {
                  for (const item of updates) {
                    updateFieldValue(item.path, item.value);
                  }
                }
              : undefined,
          onSearchChange:
            (field.component === "remoteSelect"
              || field.component === "remoteTreeSelect"
              || field.component === "user"
              || (field.remote?.source === "collaborators"
                && (field.component === "textarea" || field.component === "text")))
            && !Array.isArray(value)
              ? (keyword) => {
                  setRemoteKeywords((current) => ({ ...current, [field.key]: keyword }));
                }
              : undefined,
        }}
      />
    );
  }

  function renderCompactFormField(
    field: FormFieldSchema,
    value: unknown,
    disabled: boolean,
    path: string,
    elementKey: string,
  ) {
    const usesRemoteOptions = usesRemoteOptionSource(field);
    const options = usesRemoteOptions ? (remoteOptions[field.key] ?? []) : resolveFieldOptions(field);
    const treeOptions =
      field.component === "remoteTreeSelect" || field.component === "treeMultiSelect"
        ? (remoteTreeOptions[field.key] ?? [])
        : undefined;
    const model: BaseFieldViewModel = {
      ...toFormFieldViewModel({
        field,
        value,
        disabled,
        error: fieldErrors[path],
        options,
        treeOptions,
        searchValue: remoteKeywords[field.key] ?? "",
      }),
      label: "",
      description: undefined,
      formValues:
        field.component === "llmSuggest" ||
        field.component === "showItem" ||
        field.component === "showImage" ||
        field.component === "showFile" ||
        field.component === "showVideo" ||
        field.component === "dictTagPreview" ||
        field.component === "dictTagClassName"
          ? values
          : undefined,
      templateVersionId:
        field.component === "llmSuggest" ? formContext?.templateVersionId : undefined,
      fieldCode: field.component === "llmSuggest" ? path : undefined,
      assignmentId: field.component === "llmSuggest" ? formContext?.assignmentId : undefined,
      submissionId: field.component === "llmSuggest" ? formContext?.submissionId : undefined,
      taskId: field.component === "llmSuggest" ? formContext?.taskId : undefined,
      taskItemId: field.component === "llmSuggest" ? formContext?.taskItemId : undefined,
      itemPayload: field.component === "llmSuggest" ? formContext?.itemPayload : undefined,
      displaySchema: field.component === "llmSuggest" ? formContext?.displaySchema : undefined,
      llmSuggestInvokeAllowed:
        field.component === "llmSuggest" ? formContext?.llmSuggestInvokeAllowed : undefined,
      uiVariant: "table",
      userDisplayName: resolveUserDisplayName(field),
    };

    const errorMessage = fieldErrors[path];
    const cellClassName =
      field.component === "switch"
        ? "lh-array-table-cell-control lh-array-table-cell-control--switch"
        : field.component === "textarea"
          ? "lh-array-table-cell-control lh-array-table-cell-control--textarea"
          : "lh-array-table-cell-control";

    return (
      <div className={`${cellClassName}${errorMessage ? " is-invalid" : ""}`}>
        <FieldControlRenderer
          model={model}
          handlers={{
            onChange: (nextValue) =>
              field.component === "user"
                ? updateUserFieldValue(field, path, nextValue)
                : updateFieldValue(path, nextValue),
            onApplyFieldValues:
              field.component === "llmSuggest"
                ? (updates) => {
                    for (const item of updates) {
                      updateFieldValue(item.path, item.value);
                    }
                  }
                : undefined,
            onSearchChange:
              (field.component === "remoteSelect"
                || field.component === "remoteTreeSelect"
                || field.component === "user"
                || (field.remote?.source === "collaborators"
                  && (field.component === "textarea" || field.component === "text")))
              && !Array.isArray(value)
                ? (keyword) => {
                    setRemoteKeywords((current) => ({ ...current, [field.key]: keyword }));
                  }
                : undefined,
          }}
        />
        {errorMessage ? <span className="lh-array-table-cell-error">{errorMessage}</span> : null}
      </div>
    );
  }

  function renderArrayField(field: FormFieldSchema, path: string, value: unknown, disabled: boolean, fieldClassName: string) {
    const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

    if (field.itemLayout === "table") {
      return (
        <ArrayTableFieldControl
          field={field}
          path={path}
          items={items}
          disabled={disabled}
          formMode={mode}
          currentUser={currentUser}
          renderCell={({ childField, childPath, childValue, disabled: cellDisabled, elementKey }) =>
            renderCompactFormField(childField, childValue, cellDisabled, childPath, elementKey)
          }
          onItemsChange={(nextItems) => updateFieldValue(path, nextItems)}
        />
      );
    }

    const isolateArrayButtonEvent = (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <div className="lh-array-field">
        {items.map((item, index) => (
          <div className="lh-array-item" key={`${path}.${index}`}>
            <div className="lh-array-item-header">
              <strong>第 {index + 1} 项</strong>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onMouseDown={isolateArrayButtonEvent}
                onClick={(event) => {
                  isolateArrayButtonEvent(event);
                  updateFieldValue(
                    path,
                    items.filter((_, itemIndex) => itemIndex !== index),
                  );
                }}
              >
                删除
              </Button>
            </div>
            <div className="lh-form-grid">
              {(field.fields ?? []).map((childField) => {
                if (!hasPermission(currentUser, childField.permission)) {
                  return null;
                }
                const itemCtx =
                  item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
                const childPath = `${path}.${index}.${childField.path ?? childField.key}`;
                const childValue = getValueAtPath(values, childPath);
                if (!isFormFieldVisible(childField, mode, itemCtx)) {
                  return null;
                }
                const childDisabled = isFormFieldDisabled(childField, mode, itemCtx, disabled);
                return renderSharedFormField(
                  childField,
                  childValue,
                  childDisabled,
                  childPath,
                  childPath,
                  childField.span === 12 ? "lh-form-field--half" : fieldClassName,
                );
              })}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onMouseDown={isolateArrayButtonEvent}
          onClick={(event) => {
            isolateArrayButtonEvent(event);
            const nextItem = (field.fields ?? []).reduce<Record<string, unknown>>((accumulator, childField) => {
              return setValueAtPath(accumulator, childField.path ?? childField.key, childField.defaultValue ?? "");
            }, {});
            updateFieldValue(path, [...items, nextItem]);
          }}
        >
          新增一项
        </Button>
      </div>
    );
  }

  function renderRemoteSchemaField(field: FormFieldSchema, path: string, disabled: boolean, fieldClassName: string) {
    const remoteSchemaState = remoteSchemas[field.key] ?? { schema: EMPTY_REMOTE_SCHEMA, loading: false };
    const nestedValues = getValueAtPath(values, path);
    const nestedContext =
      nestedValues && typeof nestedValues === "object" && !Array.isArray(nestedValues)
        ? (nestedValues as Record<string, unknown>)
        : {};

    return (
      <SharedField
        key={field.key}
        className={field.span === 12 ? "lh-form-field--half" : fieldClassName}
        model={{
          key: field.key,
          label: field.label,
          component: "text",
          value: "",
          description: field.description,
          required: field.required,
          disabled,
          error: fieldErrors[path],
          uiVariant: "form",
        }}
        handlers={{ onChange: () => undefined }}
      >
        <div className="lh-remote-form">
          {remoteSchemaState.loading ? <p>正在加载表单配置...</p> : null}
          {!remoteSchemaState.loading && remoteSchemaState.error ? <p>{remoteSchemaState.error}</p> : null}
          {!remoteSchemaState.loading && !remoteSchemaState.error && remoteSchemaState.schema.sections.length === 0 ? (
            <p>请选择上游项后加载配置表单。</p>
          ) : null}
          {remoteSchemaState.schema.sections.map((section) => (
            <section className="lh-form-section" key={`${field.key}.${section.key}`}>
              {section.title ? <h3>{section.title}</h3> : null}
              {section.description ? <p>{section.description}</p> : null}
              <div className="lh-form-grid">
                {section.fields.map((childField) => {
                  if (!hasPermission(currentUser, childField.permission)) {
                    return null;
                  }
                  const childPath = `${path}.${childField.path ?? childField.key}`;
                  const childValue = getValueAtPath(values, childPath);
                  if (!isFormFieldVisible(childField, mode, nestedContext)) {
                    return null;
                  }
                  const childDisabled = isFormFieldDisabled(childField, mode, nestedContext, disabled);
                  if (childField.component === "array") {
                    return (
                      <SharedField
                        key={childPath}
                        className={childField.span === 12 ? "lh-form-field--half" : fieldClassName}
                        model={{
                          key: childField.key,
                          label: childField.label,
                          component: "text",
                          value: "",
                          description: childField.description,
                          required: childField.required,
                          disabled: childDisabled,
                          error: fieldErrors[childPath],
                          uiVariant: "form",
                        }}
                        handlers={{ onChange: () => undefined }}
                      >
                        {renderArrayField(childField, childPath, childValue, childDisabled, fieldClassName)}
                      </SharedField>
                    );
                  }
                  return renderSharedFormField(
                    childField,
                    childValue,
                    childDisabled,
                    childPath,
                    childPath,
                    childField.span === 12 ? "lh-form-field--half" : fieldClassName,
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </SharedField>
    );
  }

  async function handleSubmit() {
    const nextErrors = collectValidationErrors();
    applyFieldErrors(nextErrors);
    if (Object.values(nextErrors)[0]) {
      return false;
    }
    await onSubmit();
    return true;
  }

  function renderFormField(field: FormFieldSchema, fieldClassName = "lh-form-field--full"): ReactNode | null {
    if (!hasPermission(currentUser, field.permission)) {
      return null;
    }
    if (!isFormFieldVisible(field, mode, values)) {
      return null;
    }

    const disabled = isFormFieldDisabled(field, mode, values);
    const path = field.path ?? field.key;
    const value = getValueAtPath(values, path);

    if (field.component === "assignmentPicker") {
      if (!formContext?.recordId || !assignmentApis || !field.assignment) {
        return null;
      }
      return (
        <SharedField
          key={field.key}
          className="lh-form-field--full"
          model={{
            key: field.key,
            label: field.label,
            component: "text",
            value: "",
            description: field.description,
            required: field.required,
            disabled,
            error: fieldErrors[path],
            uiVariant: "form",
          }}
          handlers={{ onChange: () => undefined }}
        >
          <AssignmentPickerFieldControl
            field={field}
            config={field.assignment}
            assignedApi={assignmentApis.assignedApi}
            recordId={formContext.recordId}
            resource={resource}
            value={value}
            disabled={disabled}
            loadRemoteOptions={loadRemoteOptions}
            onChange={(nextValue) => updateFieldValue(path, nextValue)}
          />
        </SharedField>
      );
    }

    if (field.component === "array") {
      return (
        <SharedField
          key={field.key}
          className={field.span === 12 ? "lh-form-field--half" : fieldClassName}
          model={{
            key: field.key,
            label: field.label,
            component: "text",
            value: "",
            description: field.description,
            required: field.required,
            disabled,
            error: fieldErrors[path],
            uiVariant: "form",
          }}
          handlers={{ onChange: () => undefined }}
        >
          {renderArrayField(field, path, value, disabled, fieldClassName)}
        </SharedField>
      );
    }

    if (field.component === "dynamicTable") {
      const selectionPath = field.dynamicTable?.selectionPath ?? "selectedItemIds";
      return (
        <SharedField
          key={field.key}
          className="lh-form-field--full"
          model={{
            key: field.key,
            label: field.label,
            component: "text",
            value: "",
            description: field.description,
            required: field.required,
            disabled,
            error: fieldErrors[selectionPath] ?? fieldErrors[path],
            uiVariant: "form",
          }}
          handlers={{ onChange: () => undefined }}
        >
          <DynamicTableFieldControl
            field={field}
            values={values}
            currentUser={currentUser}
            formContext={formContext}
            onChangeSelection={(keys) => updateFieldValue(selectionPath, keys)}
          />
        </SharedField>
      );
    }

    if (field.component === "remoteSchema") {
      return renderRemoteSchemaField(field, path, disabled, fieldClassName);
    }

    return renderSharedFormField(field, value, disabled, path, field.key, field.span === 12 ? "lh-form-field--half" : fieldClassName);
  }

  return {
    introText,
    fieldErrors,
    updateFieldValue,
    collectValidationErrors,
    handleSubmit,
    renderFormField,
    renderArrayField,
    renderSharedFormField,
  };
}
