import type { FormFieldComponent, FormFieldSchema, FormSchema, OptionItem } from "@/low-code/schema/types";
import { withImportFieldMeta } from "@/low-code/schema/import-field-meta";
import { createEmptyFormSchema } from "@/low-code/utils/form-schema";

export type ImportColumnRole = "display" | "input" | "ignore";

/** 导入绑定时可选的表单组件（与设计器物料对齐的子集） */
export const IMPORT_BINDABLE_COMPONENTS: Array<{ value: FormFieldComponent; label: string }> = [
  { value: "showItem", label: "展示项" },
  { value: "text", label: "单行文本" },
  { value: "textarea", label: "多行文本" },
  { value: "number", label: "数字" },
  { value: "switch", label: "开关" },
  { value: "select", label: "下拉选择" },
  { value: "multiSelect", label: "多选下拉" },
  { value: "radioGroup", label: "单选组" },
  { value: "checkboxGroup", label: "多选组" },
  { value: "jsonEditor", label: "JSON 编辑" },
];

const CHOICE_COMPONENTS = new Set(["select", "multiSelect", "radioGroup", "checkboxGroup"]);

export interface ImportColumnConfig {
  key: string;
  role: ImportColumnRole;
  component: FormFieldComponent;
}

const INPUT_KEY_PATTERNS = [
  /^preferred$/i,
  /^margin$/i,
  /^verdict$/i,
  /^rating$/i,
  /^score$/i,
  /^label$/i,
  /^safety_flag$/i,
  /_note$/i,
  /^annotator_/i,
  /^comment$/i,
];

const DISPLAY_KEY_PATTERNS = [
  /^id$/i,
  /^sourceItemKey$/i,
  /^prompt$/i,
  /^task_type$/i,
  /^lang$/i,
  /^response_/i,
  /^model_/i,
  /^dimensions$/i,
];

function sampleValues(items: Array<Record<string, unknown>>, key: string): unknown[] {
  const out: unknown[] = [];
  for (const item of items) {
    const value = item[key];
    if (value !== undefined && value !== null) {
      out.push(value);
    }
    if (out.length >= 50) {
      break;
    }
  }
  return out;
}

export function collectImportColumnKeys(items: Array<Record<string, unknown>>): string[] {
  const keys = new Set<string>();
  for (const item of items) {
    Object.keys(item).forEach((key) => keys.add(key));
  }
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

export function guessDefaultColumnRole(key: string, samples: unknown[]): ImportColumnRole {
  if (DISPLAY_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
    return "display";
  }
  if (INPUT_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
    return "input";
  }
  if (samples.length === 0) {
    return "display";
  }
  const first = samples[0];
  if (typeof first === "boolean" || typeof first === "number") {
    return "input";
  }
  if (typeof first === "string" && first.length > 160) {
    return "display";
  }
  if (Array.isArray(first)) {
    return "display";
  }
  return "input";
}

export function guessDefaultComponent(
  key: string,
  role: ImportColumnRole,
  samples: unknown[],
): FormFieldComponent {
  if (role === "ignore") {
    return "text";
  }
  const inferred = role === "display" ? inferDisplayComponent(samples) : inferInputComponent(key, samples);
  const value = inferred.component ?? "text";
  if (IMPORT_BINDABLE_COMPONENTS.some((item) => item.value === value)) {
    return value;
  }
  return "text";
}

export function buildDefaultColumnConfigs(items: Array<Record<string, unknown>>): ImportColumnConfig[] {
  return collectImportColumnKeys(items).map((key) => {
    const samples = sampleValues(items, key);
    const role = guessDefaultColumnRole(key, samples);
    return {
      key,
      role,
      component: guessDefaultComponent(key, role, samples),
    };
  });
}

function buildOptions(values: unknown[]): OptionItem[] {
  const set = new Set<string>();
  for (const value of values) {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry != null && (typeof entry === "string" || typeof entry === "number")) {
          set.add(String(entry));
        }
      });
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      set.add(String(value));
    }
  }
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((entry) => ({ label: entry, value: entry }));
}

function inferInputComponent(key: string, samples: unknown[]): Pick<FormFieldSchema, "component" | "options"> {
  if (samples.length === 0) {
    return { component: "text" };
  }
  if (samples.every((value) => typeof value === "boolean")) {
    return { component: "switch" };
  }
  if (samples.every((value) => typeof value === "number")) {
    return { component: "number" };
  }
  if (samples.some((value) => Array.isArray(value))) {
    const options = buildOptions(samples);
    return { component: "multiSelect", options };
  }
  const stringSamples = samples.filter((value) => typeof value === "string") as string[];
  const unique = new Set(stringSamples);
  if (unique.size > 0 && unique.size <= 8 && samples.every((value) => typeof value === "string")) {
    return { component: "radioGroup", options: buildOptions(samples) };
  }
  if (stringSamples.some((value) => value.length > 160) || key === "prompt") {
    return { component: "textarea" };
  }
  return { component: "text" };
}

function inferDisplayComponent(
  samples: unknown[],
): Pick<FormFieldSchema, "component" | "showItem"> {
  if (samples.some((value) => Array.isArray(value) || (typeof value === "object" && value !== null))) {
    return {
      component: "showItem",
      showItem: { contentSource: "payload", renderAs: "json", layout: "pre" },
    };
  }
  if (
    samples.some(
      (value) => typeof value === "string" && value.includes("<") && value.includes(">"),
    )
  ) {
    return {
      component: "showItem",
      showItem: { contentSource: "payload", renderAs: "html", layout: "inline" },
    };
  }
  if (samples.some((value) => typeof value === "string" && value.length > 120)) {
    return {
      component: "showItem",
      showItem: { contentSource: "payload", renderAs: "text", layout: "pre" },
    };
  }
  return {
    component: "showItem",
    showItem: { contentSource: "payload", renderAs: "text", layout: "inline" },
  };
}

function toFieldLabel(key: string): string {
  return key;
}

function componentExtras(component: FormFieldComponent, samples: unknown[]): Partial<FormFieldSchema> {
  if (!CHOICE_COMPONENTS.has(component)) {
    return {};
  }
  return { options: buildOptions(samples) };
}

function buildField(config: ImportColumnConfig, samples: unknown[]): FormFieldSchema | null {
  const { key, role, component } = config;
  if (role === "ignore") {
    return null;
  }
  const label = toFieldLabel(key);
  const extras = componentExtras(component, samples);
  if (role === "display") {
    const displayExtras = component === "showItem" ? inferDisplayComponent(samples) : {};
    return withImportFieldMeta(
      {
        key,
        path: key,
        label,
        component: component === "showItem" ? "showItem" : component,
        readonly: true,
        ...extras,
        ...displayExtras,
      },
      "display",
    );
  }
  return withImportFieldMeta(
    {
      key,
      path: key,
      label,
      component,
      required: false,
      ...extras,
    },
    "input",
  );
}

export function buildFormSchemaFromImport(
  items: Array<Record<string, unknown>>,
  columnConfigs: ImportColumnConfig[],
): FormSchema {
  const displayFields: FormFieldSchema[] = [];
  const inputFields: FormFieldSchema[] = [];

  for (const config of columnConfigs) {
    const field = buildField(config, sampleValues(items, config.key));
    if (!field) {
      continue;
    }
    if (config.role === "display") {
      displayFields.push(field);
    } else {
      inputFields.push(field);
    }
  }

  if (displayFields.length === 0 && inputFields.length === 0) {
    return createEmptyFormSchema();
  }

  const sections = [];
  if (displayFields.length > 0) {
    sections.push({
      key: "import_source",
      title: "题目信息",
      description: "来自导入数据，只读展示",
      fields: displayFields,
    });
  }
  if (inputFields.length > 0) {
    sections.push({
      key: "import_label",
      title: "标注填写",
      description: "标注员填写并提交",
      fields: inputFields,
    });
  }

  return {
    sections,
    actions: [{ key: "submit", label: "提交", kind: "submit" }],
  };
}

export function countActiveColumns(columnConfigs: ImportColumnConfig[]): { display: number; input: number } {
  return columnConfigs.reduce(
    (acc, config) => {
      if (config.role === "display") {
        acc.display += 1;
      } else if (config.role === "input") {
        acc.input += 1;
      }
      return acc;
    },
    { display: 0, input: 0 },
  );
}
