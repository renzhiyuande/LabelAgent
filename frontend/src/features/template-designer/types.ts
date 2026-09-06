import type {
  FormFieldSchema,
  FormSchema,
  FormSectionSchema,
  ResourceMeta,
} from "@/low-code/schema/types";

export type { FormFieldSchema, FormSchema, FormSectionSchema, ResourceMeta };

export interface TemplateVersionItem {
  id: string;
  versionNo: string;
  status?: string;
  createdAt: number;
  publishedAt?: number;
  marketAuditStatus?: string;
  marketPublishedAt?: number;
  author: string;
  description: string;
  templateName?: string;
  isCurrent: boolean;
  schemaJson?: string;
}

export interface MaterialItemConfig {
  key: string;
  label: string;
  icon: string;
  description?: string;
  defaultSchema: (fieldKey: string, label: string) => FormFieldSchema;
}

export interface MaterialCategoryConfig {
  category: string;
  title: string;
  items: MaterialItemConfig[];
}

export type DndDragData =
  | { type: "material"; materialKey: string; label: string }
  | { type: "field"; fieldKey: string; sectionKey: string; label: string };
