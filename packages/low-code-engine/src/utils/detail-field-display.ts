import { createElement, type ReactNode } from "react";
import { Button } from "../components/ui/button";
import { normalizeSnowflakeId } from "../lib/id-utils";
import type { DetailFieldSchema, FormFieldSchema, OptionItem, ResourceMeta, TableColumnLinkMeta } from "../schema/types";
import { LHAuthenticatedDownloadLink } from "../components/common/LHAuthenticatedDownloadLink";
import { LHUserReference } from "../components/user/LHUserReference";
import { getValueAtPath } from "./object-path";
import { resolveUserRefFromRecord } from "./resolve-user-ref";
import { findDictOption, resolveDictLabel, resolveDictTagClassName } from "./dict-display";
import { formatFieldValue } from "./formatters";
import { resolveFieldDictCode } from "./resolve-field-dict";
import { resolveSchemaFieldDisplayLabel, resolveSchemaFieldDictCode } from "./schema-field-display";
import { resolveDetailFieldOptions } from "./detail-field-options";
import { canResolveRecordLinkHref, resolveRecordLinkHref } from "./record-template";

export interface DetailFieldDisplayCallbacks {
  onOpenRelated?: (record: Record<string, unknown>, link: TableColumnLinkMeta) => void;
  onNavigate?: (href: string, openInNewTab?: boolean) => void;
}

function resolveDetailLinkLabel(
  field: Pick<DetailFieldSchema, "key" | "type" | "formatter" | "link">,
  rawValue: unknown,
  record: Record<string, unknown>,
): string {
  const displayValue =
    field.link?.labelField != null
      ? getValueAtPath(record, field.link.labelField)
      : rawValue;
  return formatFieldValue(
    { type: field.type, formatter: field.link?.formatter ?? field.formatter },
    displayValue,
  );
}

export function renderDetailFieldValue(
  field: Pick<
    DetailFieldSchema,
    "key" | "type" | "formatter" | "dict" | "enum" | "options" | "user" | "link"
  >,
  rawValue: unknown,
  resource: ResourceMeta | undefined,
  dictOptions: Record<string, OptionItem[]>,
  formField?: FormFieldSchema,
  remoteOptions?: OptionItem[],
  record?: Record<string, unknown>,
  callbacks?: DetailFieldDisplayCallbacks,
): ReactNode {
  if (field.type === "user" && record) {
    const userRef = resolveUserRefFromRecord(record, field.key, field.user);
    return createElement(LHUserReference, {
      userId: userRef.userId,
      displayName: userRef.displayName ?? (rawValue == null ? null : String(rawValue)),
      role: userRef.role,
    });
  }
  if (field.type === "link" && record) {
    const linkMeta = field.link;
    if (
      linkMeta?.action === "openRelated"
      && linkMeta.resourceKey
      && callbacks?.onOpenRelated
    ) {
      const linkLabel = resolveDetailLinkLabel(field, rawValue, record);
      return createElement(
        Button,
        {
          type: "button",
          variant: "ghost",
          className: "h-auto max-w-full px-0 text-primary hover:bg-transparent hover:underline",
          onClick: (event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            callbacks.onOpenRelated?.(record, linkMeta);
          },
        },
        linkLabel,
      );
    }
    if (linkMeta?.href && callbacks?.onNavigate && canResolveRecordLinkHref(linkMeta.href, record)) {
      const linkLabel = resolveDetailLinkLabel(field, rawValue, record);
      const href = resolveRecordLinkHref(linkMeta.href, record);
      return createElement(
        Button,
        {
          type: "button",
          variant: "ghost",
          className: "h-auto max-w-full px-0 text-primary hover:bg-transparent hover:underline",
          onClick: (event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            callbacks.onNavigate?.(href, linkMeta.openInNewTab);
          },
        },
        linkLabel || href,
      );
    }
    const label = rawValue == null || rawValue === "" ? null : String(rawValue);
    const hrefKey = field.key.endsWith("Name")
      ? `${field.key.slice(0, -4)}DownloadUrl`
      : `${field.key}DownloadUrl`;
    const href = getValueAtPath(record, hrefKey);
    if (href == null || href === "") {
      return label ?? "-";
    }
    const fileIdKey = field.key.endsWith("Name")
      ? `${field.key.slice(0, -4)}Id`
      : `${field.key}Id`;
    const fileId = getValueAtPath(record, fileIdKey) as string | number | undefined;
    return createElement(LHAuthenticatedDownloadLink, {
      href: String(href),
      fileId,
      fileName: label ?? undefined,
      children: label ?? "下载",
    });
  }
  const enumOptions = field.enum?.length ? field.enum : field.options;
  if (enumOptions?.length) {
    const matched = enumOptions.find((item) => String(item.value) === String(rawValue ?? ""))
      ?? enumOptions.find((item) => item.label === String(rawValue ?? ""));
    if (matched) {
      if (field.type === "status" || field.type === "enum" || matched.tone || matched.className) {
        return createElement("span", { className: resolveDictTagClassName(matched) }, matched.label);
      }
      return matched.label;
    }
  }
  const dictCode = resolveFieldDictCode(field, resource);
  if (dictCode) {
    const matched = findDictOption(dictOptions[dictCode], rawValue);
    const label = resolveDictLabel(matched, rawValue);
    if (field.type === "status" || matched?.tone || matched?.className) {
      return createElement("span", { className: resolveDictTagClassName(matched) }, label);
    }
    return label;
  }
  if (formField) {
    const resolvedOptions = resolveDetailFieldOptions(formField, record ?? {}, remoteOptions);
    const formDictCode = resolveSchemaFieldDictCode(formField);
    if (resolvedOptions.length > 0 || formDictCode) {
      return resolveSchemaFieldDisplayLabel(
        { ...formField, options: resolvedOptions.length > 0 ? resolvedOptions : formField.options },
        rawValue,
        dictOptions,
      );
    }
  }
  return formatFieldValue(field, rawValue);
}

export function resolveDictStatusLabel(
  value: unknown,
  dictCode: string | undefined,
  dictOptions: Record<string, OptionItem[]>,
): { label: string; tone?: string; className?: string } {
  if (!dictCode) {
    return { label: value == null || value === "" ? "-" : String(value) };
  }
  const matched = findDictOption(dictOptions[dictCode], value);
  return {
    label: resolveDictLabel(matched, value),
    tone: matched?.tone,
    className: matched?.className,
  };
}
