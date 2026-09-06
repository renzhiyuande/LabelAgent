import { getValueAtPath } from "@/low-code/utils/object-path";
import {
  collectTemplateDisplayFields,
  resolveTemplateFieldBinding,
  resolveTemplateFieldLabel,
} from "./payload-display-fields";
import type { PayloadPanelBodyProps } from "./types";

export interface PayloadTableRow {
  /** payload 绑定键，如 lang */
  binding: string;
  /** template 配置的 label */
  label: string;
  raw: unknown;
}

export function buildPayloadTableRows({
  payload,
  displaySchema,
  displayValues,
  hasTemplateDisplay,
}: Pick<
  PayloadPanelBodyProps,
  "payload" | "displaySchema" | "displayValues" | "hasTemplateDisplay"
>): PayloadTableRow[] {
  if (hasTemplateDisplay) {
    return collectTemplateDisplayFields(displaySchema).map((field) => {
      const binding = resolveTemplateFieldBinding(field);
      const path = field.path ?? field.key;
      const raw = getValueAtPath(displayValues, path);
      return {
        binding,
        label: resolveTemplateFieldLabel(field),
        raw,
      };
    });
  }

  return Object.entries(payload).map(([binding, raw]) => ({
    binding,
    label: binding,
    raw,
  }));
}

export interface PayloadSectionTableGroup {
  sectionKey: string;
  title?: string;
  rows: PayloadTableRow[];
}

export function buildPayloadSectionTableGroups({
  payload,
  displaySchema,
  displayValues,
  hasTemplateDisplay,
}: Pick<
  PayloadPanelBodyProps,
  "payload" | "displaySchema" | "displayValues" | "hasTemplateDisplay"
>): PayloadSectionTableGroup[] {
  if (!hasTemplateDisplay) {
    const rows = buildPayloadTableRows({ payload, displaySchema, displayValues, hasTemplateDisplay });
    if (rows.length === 0) {
      return [];
    }
    return [{ sectionKey: "__payload", rows }];
  }

  return displaySchema.sections
    .map((section) => {
      const rows = section.fields.map((field) => {
        const binding = resolveTemplateFieldBinding(field);
        const path = field.path ?? field.key;
        const raw = getValueAtPath(displayValues, path);
        return {
          binding,
          label: resolveTemplateFieldLabel(field),
          raw,
        };
      });

      if (rows.length === 0) {
        return null;
      }

      return {
        sectionKey: section.key,
        title: section.title,
        rows,
      };
    })
    .filter(Boolean) as PayloadSectionTableGroup[];
}

