import type { FormFieldSchema } from "@/low-code/schema/types";
import { withImportFieldMeta } from "@/low-code/schema/import-field-meta";
import type { MaterialCategoryConfig } from "../types";

export const MATERIAL_CATEGORIES: MaterialCategoryConfig[] = [
  {
    category: "basic",
    title: "基础组件",
    items: [
      {
        key: "text",
        label: "单行输入",
        icon: "Type",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "text" }),
      },
      {
        key: "textarea",
        label: "多行文本",
        icon: "AlignLeft",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "textarea" }),
      },
      {
        key: "richText",
        label: "富文本",
        icon: "FileText",
        defaultSchema: (key, label) => ({
          key,
          path: key,
          label,
          component: "richText",
          richText: { enableAssetLibrary: false, imageMaxHeight: 240, imageFit: "contain", previewImageResize: true },
        }),
      },
      {
        key: "select",
        label: "单选下拉",
        icon: "ChevronDown",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "select", options: [] }),
      },
      {
        key: "multiSelect",
        label: "多选下拉",
        icon: "ListChecks",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "multiSelect", options: [] }),
      },
      {
        key: "tags",
        label: "标签选择",
        icon: "Tags",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "tags", options: [] }),
      },
      {
        key: "radioGroup",
        label: "单选组",
        icon: "Circle",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "radioGroup", options: [] }),
      },
      {
        key: "checkboxGroup",
        label: "多选组",
        icon: "CheckSquare",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "checkboxGroup", options: [] }),
      },
      {
        key: "switch",
        label: "开关",
        icon: "ToggleLeft",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "switch" }),
      },
    ],
  },
  {
    category: "advanced",
    title: "高级组件",
    items: [
      {
        key: "remoteSelect",
        label: "远程选择",
        icon: "Link",
        defaultSchema: (key, label) => ({
          key,
          path: key,
          label,
          component: "remoteSelect",
          remote: { source: "" },
        }),
      },
      {
        key: "jsonEditor",
        label: "JSON 编辑",
        icon: "Braces",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "jsonEditor" }),
      },
      {
        key: "fileUpload",
        label: "文件上传",
        icon: "Paperclip",
        defaultSchema: (key, label) => ({
          key,
          path: key,
          label,
          component: "fileUpload",
          upload: { multiple: false, maxCount: 1, maxSizeMb: 10, accept: "*/*", showFileName: true, allowRename: true },
        }),
      },
      {
        key: "imageUpload",
        label: "图片上传",
        icon: "Image",
        defaultSchema: (key, label) => ({
          key,
          path: key,
          label,
          component: "imageUpload",
          upload: { multiple: false, maxCount: 1, maxSizeMb: 5, accept: "image/*", displayMode: "thumbnail", previewOnClick: true, showFileName: true },
        }),
      },
      {
        key: "array",
        label: "数组/子表单",
        icon: "List",
        defaultSchema: (key, label) => ({ key, path: key, label, component: "array", fields: [] }),
      },
    ],
  },
  {
    category: "display",
    title: "展示组件",
    items: [
      {
        key: "showItem",
        label: "展示项",
        icon: "Eye",
        defaultSchema: (key, label) =>
          withImportFieldMeta(
            {
              key,
              path: key,
              label,
              component: "showItem",
              showItem: {
                contentSource: "payload",
                renderAs: "text",
                layout: "inline",
              },
            },
            "display",
          ),
      },
      {
        key: "showImage",
        label: "展示图片",
        icon: "Image",
        defaultSchema: (key, label) =>
          withImportFieldMeta(
            {
              key,
              path: key,
              label,
              component: "showImage",
              showImage: { contentSource: "payload", fit: "contain", maxHeight: 280, multiple: false, displayMode: "thumbnail", previewOnClick: true, showFileName: true },
            },
            "display",
          ),
      },
      {
        key: "showFile",
        label: "展示文件",
        icon: "FileText",
        defaultSchema: (key, label) =>
          withImportFieldMeta(
            {
              key,
              path: key,
              label,
              component: "showFile",
              showFile: { contentSource: "payload", showSize: true },
            },
            "display",
          ),
      },
      {
        key: "showVideo",
        label: "展示视频",
        icon: "Video",
        defaultSchema: (key, label) =>
          withImportFieldMeta(
            {
              key,
              path: key,
              label,
              component: "showVideo",
              showVideo: {
                contentSource: "payload",
                showFileName: true,
                maxHeight: 360,
                controls: true,
              },
            },
            "display",
          ),
      },
    ],
  },
  {
    category: "assist",
    title: "智能辅助",
    items: [
      {
        key: "llmSuggest",
        label: "LLM 推荐",
        icon: "Sparkles",
        defaultSchema: (key, label): FormFieldSchema =>
          withImportFieldMeta(
            {
              key,
              path: `__${key}`,
              label,
              component: "llmSuggest",
              description: "运行时生成，不参与题目导入与标注提交。",
              llm: {
                buttonLabel: "获取建议",
                allowRegenerate: true,
                contextFields: [],
              },
            },
            "runtime",
          ),
      },
    ],
  },
];

const materialMap = new Map<string, MaterialCategoryConfig["items"][number]>();
for (const category of MATERIAL_CATEGORIES) {
  for (const item of category.items) {
    materialMap.set(item.key, item);
  }
}

export function getMaterialItem(materialKey: string) {
  return materialMap.get(materialKey);
}

export function createFieldFromMaterial(materialKey: string, fieldKey: string, label?: string) {
  const material = getMaterialItem(materialKey);
  if (!material) {
    return null;
  }
  return material.defaultSchema(fieldKey, label ?? material.label);
}
