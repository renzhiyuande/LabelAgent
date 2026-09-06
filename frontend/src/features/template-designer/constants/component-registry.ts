import type { FormFieldComponent, FormFieldSchema } from "@/low-code/schema/types";

export type ComponentCategory = "basic" | "choice" | "remote" | "advanced" | "structure";

export interface ComponentMeta {
  value: string;
  label: string;
  category: ComponentCategory;
}

export type ComponentSpecificPropKey =
  | "defaultValue"
  | "options"
  | "optionsFrom"
  | "optionMap"
  | "dependsOn"
  | "remote"
  | "assignment"
  | "upload"
  | "llm"
  | "display"
  | "showImage"
  | "showFile"
  | "showVideo"
  | "richText"
  | "rules"
  | "permission"
  | "fields";

const COMMON_FIELD_KEYS: Array<keyof FormFieldSchema> = [
  "key",
  "path",
  "label",
  "component",
  "required",
  "readonly",
  "hidden",
  "placeholder",
  "description",
  "span",
  "visibleWhen",
  "disabledWhen",
];

export const ALL_COMPONENTS: ComponentMeta[] = [
  { value: "text", label: "单行输入", category: "basic" },
  { value: "textarea", label: "多行输入", category: "basic" },
  { value: "richText", label: "富文本", category: "basic" },
  { value: "showItem", label: "展示项", category: "basic" },
  { value: "showImage", label: "展示图片", category: "basic" },
  { value: "showFile", label: "展示文件", category: "basic" },
  { value: "showVideo", label: "展示视频", category: "basic" },
  { value: "switch", label: "开关", category: "basic" },
  { value: "select", label: "下拉选择", category: "choice" },
  { value: "multiSelect", label: "多选下拉", category: "choice" },
  { value: "tags", label: "标签选择", category: "choice" },
  { value: "radioGroup", label: "单选组", category: "choice" },
  { value: "checkboxGroup", label: "多选组", category: "choice" },
  { value: "remoteSelect", label: "远程下拉", category: "remote" },
  { value: "remoteTreeSelect", label: "远程树选择", category: "remote" },
  { value: "jsonEditor", label: "JSON 编辑", category: "advanced" },
  { value: "codeEditor", label: "代码编辑", category: "advanced" },
  { value: "dateRange", label: "日期范围", category: "advanced" },
  { value: "dateTimeRange", label: "日期时间范围", category: "advanced" },
  { value: "numberRange", label: "数值范围", category: "advanced" },
  { value: "llmSuggest", label: "LLM 推荐", category: "advanced" },
  { value: "fileUpload", label: "文件上传", category: "advanced" },
  { value: "imageUpload", label: "图片上传", category: "advanced" },
  { value: "array", label: "数组/子表单", category: "structure" },
];

export const COMPONENT_DEFAULTS: Record<string, Partial<FormFieldSchema>> = {
  text: {},
  textarea: {},
  richText: { richText: { enableAssetLibrary: false, imageMaxHeight: 240, imageFit: "contain", previewImageResize: true } },
  switch: {},
  select: { options: [] },
  multiSelect: { options: [] },
  tags: { options: [] },
  radioGroup: { options: [] },
  checkboxGroup: { options: [] },
  showItem: {
    readonly: true,
    description: "只读展示，不参与标注提交。",
    showItem: {
      contentSource: "payload",
      renderAs: "text",
      layout: "inline",
    },
  },
  showImage: {
    readonly: true,
    description: "只读展示图片，不参与标注提交。",
    showImage: { contentSource: "payload", fit: "contain", maxHeight: 280, multiple: false, displayMode: "thumbnail", previewOnClick: true, showFileName: true },
  },
  showFile: {
    readonly: true,
    description: "只读展示文件链接，不参与标注提交。",
    showFile: { contentSource: "payload", showSize: true },
  },
  showVideo: {
    readonly: true,
    description: "只读展示视频，不参与标注提交。",
    showVideo: { contentSource: "payload", showFileName: true, maxHeight: 360, controls: true },
  },
  remoteSelect: { remote: { source: "" } },
  remoteTreeSelect: { remote: { source: "", variant: "tree" } },
  jsonEditor: {},
  codeEditor: {},
  dateRange: {},
  dateTimeRange: {},
  numberRange: {},
  llmSuggest: {
    llm: {
      buttonLabel: "获取建议",
      allowRegenerate: true,
      contextFields: [],
    },
  },
  fileUpload: {
    upload: { multiple: false, maxCount: 1, maxSizeMb: 10, accept: "*/*", showFileName: true, allowRename: true },
  },
  imageUpload: { upload: { multiple: false, maxCount: 1, maxSizeMb: 5, accept: "image/*", displayMode: "thumbnail", previewOnClick: true, showFileName: true } },
  array: { fields: [] },
};

const COMPONENT_SPECIFIC_PROPS: Record<string, ComponentSpecificPropKey[]> = {
  text: ["defaultValue", "rules", "permission"],
  textarea: ["defaultValue", "rules", "permission"],
  richText: ["richText", "defaultValue", "rules", "permission"],
  switch: ["defaultValue", "rules", "permission"],
  select: ["defaultValue", "options", "dependsOn", "optionMap", "rules", "permission"],
  multiSelect: ["defaultValue", "options", "dependsOn", "optionMap", "rules", "permission"],
  tags: ["defaultValue", "options", "dependsOn", "optionMap", "rules", "permission"],
  radioGroup: ["defaultValue", "options", "dependsOn", "optionMap", "rules", "permission"],
  checkboxGroup: ["defaultValue", "options", "dependsOn", "optionMap", "rules", "permission"],
  showItem: ["display", "permission"],
  showImage: ["showImage", "permission"],
  showFile: ["showFile", "permission"],
  showVideo: ["showVideo", "permission"],
  remoteSelect: ["defaultValue", "remote", "rules", "permission"],
  remoteTreeSelect: ["defaultValue", "remote", "rules", "permission"],
  jsonEditor: ["defaultValue", "rules", "permission"],
  codeEditor: ["defaultValue", "rules", "permission"],
  dateRange: ["defaultValue", "rules", "permission"],
  dateTimeRange: ["defaultValue", "rules", "permission"],
  numberRange: ["defaultValue", "rules", "permission"],
  llmSuggest: ["llm", "permission"],
  fileUpload: ["upload", "rules", "permission"],
  imageUpload: ["upload", "rules", "permission"],
  array: ["defaultValue", "fields", "rules", "permission"],
};

export function getPropsForComponent(component: string): ComponentSpecificPropKey[] {
  return COMPONENT_SPECIFIC_PROPS[component] ?? ["defaultValue", "rules", "permission"];
}

export function getComponentDefaultPatch(component: string): Partial<FormFieldSchema> {
  return COMPONENT_DEFAULTS[component] ?? {};
}

function resolveSchemaKeysForComponentProps(props: ComponentSpecificPropKey[]): Array<keyof FormFieldSchema> {
  const keys: Array<keyof FormFieldSchema> = [];
  for (const prop of props) {
    if (prop === "display") {
      keys.push("formatter", "displayType", "showItem");
      continue;
    }
    if (prop === "showImage") {
      keys.push("showImage");
      continue;
    }
    if (prop === "showFile") {
      keys.push("showFile");
      continue;
    }
    if (prop === "showVideo") {
      keys.push("showVideo");
      continue;
    }
    if (prop === "richText") {
      keys.push("richText");
      continue;
    }
    keys.push(prop as keyof FormFieldSchema);
  }
  return keys;
}

export function sanitizeFieldForComponent(field: FormFieldSchema, component: FormFieldComponent): FormFieldSchema {
  const allowed = new Set<keyof FormFieldSchema>([
    ...COMMON_FIELD_KEYS,
    ...resolveSchemaKeysForComponentProps(getPropsForComponent(component)),
  ]);
  if (
    component === "showItem" ||
    component === "llmSuggest" ||
    component === "showImage" ||
    component === "showFile" ||
    component === "showVideo"
  ) {
    allowed.add("meta");
  }
  const sanitized: Partial<FormFieldSchema> = {};
  for (const [key, value] of Object.entries(field) as Array<[keyof FormFieldSchema, unknown]>) {
    if (allowed.has(key)) {
      (sanitized as Record<string, unknown>)[key] = value;
    }
  }
  return {
    ...sanitized,
    key: field.key,
    label: field.label,
    component,
  };
}
