import type {
  DetailFieldSchema,
  FormFieldSchema,
  FormSchema,
  OptionItem,
  RemoteSchemaMeta,
  ResourceMeta,
} from "../schema/types";
import { collectSectionDefaults, mergeFormValues } from "./form-values";
import {
  applyRemoteSchemaBindingsToRecord,
  isRecordObject,
  parseJsonFieldValue,
  splitRemoteSchemaBinding,
} from "./remote-schema";
import { getValueAtPath, setValueAtPath } from "./object-path";

function flattenFormFields(fields: FormFieldSchema[]): FormFieldSchema[] {
  return fields.flatMap((field) => [field, ...(field.fields?.length ? flattenFormFields(field.fields) : [])]);
}

export function flattenRemoteSchemaFields(schema: FormSchema): FormFieldSchema[] {
  return schema.sections.flatMap((section) => flattenFormFields(section.fields));
}

export function findRemoteSchemaFormFieldForDetail(
  resource: ResourceMeta | undefined,
  detailField: Pick<DetailFieldSchema, "key" | "path" | "label" | "remoteSchema">,
): FormFieldSchema | undefined {
  const payloadKey = detailField.path ?? detailField.key;
  const formFields = resource?.form?.sections.flatMap((section) => flattenFormFields(section.fields)) ?? [];

  if (detailField.remoteSchema) {
    return (
      formFields.find((field) => field.component === "remoteSchema" && field.remoteSchema === detailField.remoteSchema)
      ?? formFields.find(
          (field) => field.component === "remoteSchema" && field.remoteSchema?.api === detailField.remoteSchema?.api,
        )
    );
  }

  return (
    formFields.find(
      (field) =>
        field.component === "remoteSchema" && field.remoteSchema?.binding?.payloadField === payloadKey,
    )
    ?? formFields.find(
      (field) => field.component === "remoteSchema" && (field.path ?? field.key) === payloadKey,
    )
  );
}

export function shouldRenderDetailAsRemoteSchema(
  resource: ResourceMeta | undefined,
  detailField: Pick<DetailFieldSchema, "key" | "path" | "label" | "type" | "remoteSchema">,
): boolean {
  if (detailField.type === "remoteSchema") {
    return true;
  }
  return Boolean(findRemoteSchemaFormFieldForDetail(resource, detailField));
}

export function remoteSchemaApiHasPathParams(api: string | undefined): boolean {
  if (!api) {
    return false;
  }
  return /\{[^}]+\}/.test(api);
}

const parseJsonPayload = parseJsonFieldValue;

export interface DetailRemoteSchemaContext {
  formField: FormFieldSchema;
  remoteSchema: RemoteSchemaMeta;
  mode?: string;
  config: Record<string, unknown>;
  enrichedRecord: Record<string, unknown>;
  modeField?: FormFieldSchema;
}

export function resolveDetailRemoteSchemaContext(
  resource: ResourceMeta | undefined,
  detailField: Pick<DetailFieldSchema, "key" | "path" | "label" | "remoteSchema">,
  displayRecord: Record<string, unknown>,
): DetailRemoteSchemaContext | null {
  const remoteSchemaField = findRemoteSchemaFormFieldForDetail(resource, detailField);
  const remoteSchema = detailField.remoteSchema ?? remoteSchemaField?.remoteSchema;
  if (!remoteSchema || !remoteSchemaField) {
    return null;
  }

  const payloadKey = remoteSchema.binding?.payloadField ?? detailField.path ?? detailField.key;
  const configFieldPath = remoteSchemaField.path ?? remoteSchemaField.key;
  const modeFieldPath = remoteSchema.binding?.modeField ?? remoteSchema.dependsOn;
  const discriminatorKey = remoteSchema.binding?.discriminatorKey ?? "mode";
  const enrichedRecord = resource ? applyRemoteSchemaBindingsToRecord(displayRecord, resource) : displayRecord;
  const payload = parseJsonPayload(getValueAtPath(displayRecord, payloadKey));
  const split = splitRemoteSchemaBinding(payload, discriminatorKey);
  const modeFromRecord = modeFieldPath ? String(getValueAtPath(enrichedRecord, modeFieldPath) ?? "").trim() : "";
  const configFromRecord = getValueAtPath(enrichedRecord, configFieldPath);
  const fallbackConfig = splitRemoteSchemaBinding(payload, discriminatorKey).config ?? {};
  const useFullPayloadAsConfig = !modeFieldPath && !remoteSchemaApiHasPathParams(remoteSchema.api);
  const payloadConfig = isRecordObject(payload) ? payload : {};
  const boundConfig =
    configFromRecord && typeof configFromRecord === "object" && !Array.isArray(configFromRecord)
      ? (configFromRecord as Record<string, unknown>)
      : {};
  const config: Record<string, unknown> = useFullPayloadAsConfig
    ? mergeFormValues(boundConfig, payloadConfig)
    : split.config && Object.keys(split.config).length > 0
      ? split.config
      : Object.keys(boundConfig).length > 0
        ? boundConfig
        : fallbackConfig;

  const modeField = modeFieldPath
    ? flattenFormFields(resource?.form?.sections.flatMap((section) => section.fields) ?? []).find(
        (field) => (field.path ?? field.key) === modeFieldPath || field.key === modeFieldPath,
      )
    : undefined;

  const mode = split.mode ?? (modeFromRecord || undefined);
  const enrichedWithMode =
    mode && modeFieldPath
      ? setValueAtPath(enrichedRecord, modeFieldPath, mode)
      : enrichedRecord;

  return {
    formField: remoteSchemaField,
    remoteSchema,
    mode,
    config: config ?? {},
    enrichedRecord: enrichedWithMode,
    modeField,
  };
}

/** 详情 remoteSchema 请求需带上解析出的 mode，避免 URL 仍含 `{rewardRuleMode}` 占位符。 */
export function buildDetailRemoteSchemaFetchValues(
  context: DetailRemoteSchemaContext,
): Record<string, unknown> {
  return context.enrichedRecord;
}

/** 详情区标题与表单 mode 字段同名时，内层行改用更具体的标签，避免重复展示。 */
export function resolveRemoteSchemaModeRowLabel(
  detailLabel: string | undefined,
  modeField: FormFieldSchema | undefined,
): string {
  const modeLabel = modeField?.label?.trim() || "类型";
  const normalizedDetail = detailLabel?.trim() ?? "";
  if (normalizedDetail && modeLabel === normalizedDetail) {
    return "规则类型";
  }
  return modeLabel;
}

export function resolveRemoteSchemaModeLabel(
  mode: string | undefined,
  modeField: FormFieldSchema | undefined,
  fieldOptions: Record<string, OptionItem[]>,
): string {
  if (!mode) {
    return "—";
  }
  if (!modeField) {
    return mode;
  }
  const options = fieldOptions[modeField.key] ?? modeField.options ?? [];
  const matched = options.find((item) => String(item.value) === mode);
  return matched?.label ?? mode;
}

export function resolveRemoteSchemaDisplayConfig(
  schema: FormSchema,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema.sections.length) {
    return config;
  }
  return mergeFormValues(collectSectionDefaults(schema.sections), config);
}
