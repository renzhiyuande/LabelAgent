import { getValueAtPath } from "@/low-code/utils/object-path";
import type { FormSchema } from "@/low-code/schema/types";
import {
  resolveTemplateFieldBinding,
  resolveTemplateFieldLabel,
} from "../payload/payload-display-fields";
import { collectTemplateInputFields } from "./annotate-display-fields";

export interface AnnotateTableRow {
  binding: string;
  label: string;
  raw: unknown;
}

export function buildAnnotateTableRows({
  annotateSchema,
  values,
}: {
  annotateSchema: FormSchema;
  values: Record<string, unknown>;
}): AnnotateTableRow[] {
  return collectTemplateInputFields(annotateSchema).map((field) => {
    const path = field.path ?? field.key;
    return {
      binding: resolveTemplateFieldBinding(field),
      label: resolveTemplateFieldLabel(field),
      raw: getValueAtPath(values, path),
    };
  });
}

export interface AnnotateSectionTableGroup {
  sectionKey: string;
  title?: string;
  rows: AnnotateTableRow[];
}

export function buildAnnotateSectionTableGroups({
  annotateSchema,
  values,
}: {
  annotateSchema: FormSchema;
  values: Record<string, unknown>;
}): AnnotateSectionTableGroup[] {
  return annotateSchema.sections
    .map((section) => {
      const rows = section.fields.map((field) => {
        const path = field.path ?? field.key;
        return {
          binding: resolveTemplateFieldBinding(field),
          label: resolveTemplateFieldLabel(field),
          raw: getValueAtPath(values, path),
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
    .filter(Boolean) as AnnotateSectionTableGroup[];
}
