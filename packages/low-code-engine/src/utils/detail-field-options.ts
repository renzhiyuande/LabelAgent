import type { AuthenticatedUser } from "../lib/types";
import type {
  DetailFieldSchema,
  FormFieldSchema,
  OptionItem,
  RemoteOptionMeta,
  RemoteOptionQuery,
  ResourceMeta,
} from "../schema/types";
import { hasPermission } from "./permissions";
import { getValueAtPath } from "./object-path";
import { resolveDetailRemoteSchemaContext } from "./detail-remote-schema";
import {
  buildRemoteOptionQuery as buildRemoteOptionQueryCore,
  isRemoteOptionQueryReady,
  type RemoteOptionBuildContext,
} from "./remote-option-query";

export type DetailFieldOptionLoadResult = {
  fieldOptions: Record<string, OptionItem[]>;
  fieldOptionErrors: Record<string, string>;
};

function flattenFormFields(fields: FormFieldSchema[]): FormFieldSchema[] {
  return fields.flatMap((field) => [field, ...(field.fields?.length ? flattenFormFields(field.fields) : [])]);
}

export function getDetailFieldOptionKey(field: Pick<DetailFieldSchema, "key" | "path">): string {
  return field.path ?? field.key;
}

export function findFormFieldForDetail(
  resource: ResourceMeta | undefined,
  detailField: Pick<DetailFieldSchema, "key" | "path">,
): FormFieldSchema | undefined {
  const formFields = resource?.form?.sections.flatMap((section) => flattenFormFields(section.fields)) ?? [];
  const detailPath = detailField.path ?? detailField.key;

  return (
    formFields.find((field) => (field.path ?? field.key) === detailPath) ??
    formFields.find((field) => field.key === detailField.key)
  );
}

export function buildDetailRemoteOptionQuery(
  field: FormFieldSchema,
  record: Record<string, unknown>,
): RemoteOptionQuery {
  return buildRemoteOptionQueryCore(field.remote, { values: record });
}

export function buildFormRemoteOptionQuery(
  remote: RemoteOptionMeta | undefined,
  context: RemoteOptionBuildContext,
): RemoteOptionQuery {
  return buildRemoteOptionQueryCore(remote, context);
}

export function shouldLoadDetailRemoteOptions(field: FormFieldSchema | undefined): boolean {
  if (!field) {
    return false;
  }
  return field.component === "remoteSelect" && Boolean(field.remote?.source);
}

function resolveDetailFieldOptionError(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message : "远程选项加载失败";
}

export async function loadDetailFieldOptions(params: {
  resource: ResourceMeta;
  record: Record<string, unknown>;
  currentUser?: AuthenticatedUser | null;
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
}): Promise<DetailFieldOptionLoadResult> {
  const { resource, record, currentUser = null, loadRemoteOptions } = params;
  const visibleFields =
    resource.detail?.sections
      .flatMap((section) => section.fields)
      .filter((field) => hasPermission(currentUser, field.permission)) ?? [];
  const fieldOptions: Record<string, OptionItem[]> = {};
  const fieldOptionErrors: Record<string, string> = {};

  const remoteSchemaModeFields = visibleFields
    .map((field) => resolveDetailRemoteSchemaContext(resource, field, record)?.modeField)
    .filter((field): field is FormFieldSchema => Boolean(field))
    .filter((field, index, fields) => fields.findIndex((item) => item.key === field.key) === index);

  await Promise.all(
    [...visibleFields, ...remoteSchemaModeFields].map(async (field) => {
      const cacheKey = getDetailFieldOptionKey(field);
      const formField = findFormFieldForDetail(resource, field);
      if (!formField) {
        fieldOptions[cacheKey] = [];
        return;
      }

      try {
        if (formField.dict) {
          fieldOptions[cacheKey] = await loadRemoteOptions(`dict:${formField.dict}`, undefined);
          return;
        }
        if (shouldLoadDetailRemoteOptions(formField)) {
          const query = buildDetailRemoteOptionQuery(formField, record);
          if (!isRemoteOptionQueryReady(formField.remote, record)) {
            fieldOptions[cacheKey] = [];
            return;
          }
          fieldOptions[cacheKey] = await loadRemoteOptions(formField.remote!.source, query);
          return;
        }
        fieldOptions[cacheKey] = [];
      } catch (error) {
        const message = resolveDetailFieldOptionError(error);
        fieldOptions[cacheKey] = [];
        fieldOptionErrors[cacheKey] = message;
        console.warn(`[detail] failed to load options for "${cacheKey}"`, {
          resource: resource.resource,
          source: formField.dict ? `dict:${formField.dict}` : formField.remote?.source,
          error,
        });
      }
    }),
  );

  return { fieldOptions, fieldOptionErrors };
}

export function resolveDetailFieldOptions(
  field: FormFieldSchema | undefined,
  record: Record<string, unknown>,
  remoteOptions?: OptionItem[],
): OptionItem[] {
  if (!field) {
    return [];
  }
  if (remoteOptions?.length) {
    return remoteOptions;
  }
  if (field.optionMap && field.dependsOn) {
    const dependencyValue = getValueAtPath(record, field.dependsOn);
    return field.optionMap[String(dependencyValue ?? "")] ?? [];
  }
  if (field.optionsFrom) {
    const sourceValue = getValueAtPath(record, field.optionsFrom);
    return Array.isArray(sourceValue)
      ? sourceValue.filter((item): item is OptionItem => {
          return Boolean(item) && typeof item === "object" && "label" in item && "value" in item;
        })
      : [];
  }
  return field.options ?? [];
}
