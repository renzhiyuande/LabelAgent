"use client";

import type { FormFieldSchema, OptionItem } from "../../../schema/types";
import type { TreeOptionNode } from "../../../adapters/tree-options";
import type { BaseFieldViewModel } from "../types";

interface ToFormFieldViewModelOptions {
  field: FormFieldSchema;
  value: unknown;
  disabled: boolean;
  error?: string;
  options: OptionItem[];
  treeOptions?: TreeOptionNode[];
  searchValue?: string;
}

export function toFormFieldViewModel({
  field,
  value,
  disabled,
  error,
  options,
  treeOptions = [],
  searchValue,
}: ToFormFieldViewModelOptions): BaseFieldViewModel {
  if (field.component === "showItem") {
    return {
      key: field.key,
      label: field.label,
      component: "showItem",
      value,
      description: field.description,
      required: false,
      disabled: true,
      error,
      uiVariant: "form",
      formatter: field.formatter,
      displayType: field.displayType,
      showItem: field.showItem,
    };
  }

  if (field.component === "showImage") {
    return {
      key: field.key,
      label: field.label,
      component: "showImage",
      value,
      description: field.description,
      required: false,
      disabled: true,
      error,
      uiVariant: "form",
      showImage: field.showImage,
    };
  }

  if (field.component === "showFile") {
    return {
      key: field.key,
      label: field.label,
      component: "showFile",
      value,
      description: field.description,
      required: false,
      disabled: true,
      error,
      uiVariant: "form",
      showFile: field.showFile,
    };
  }

  if (field.component === "showVideo") {
    return {
      key: field.key,
      label: field.label,
      component: "showVideo",
      value,
      description: field.description,
      required: false,
      disabled: true,
      error,
      uiVariant: "form",
      showVideo: field.showVideo,
    };
  }

  if (field.component === "llmSuggest") {
    return {
      key: field.key,
      label: field.label,
      component: "llmSuggest",
      value,
      description: field.description,
      required: false,
      disabled,
      error,
      uiVariant: "form",
      llm: field.llm,
    };
  }

  if (field.component === "remoteSelect" && Array.isArray(value)) {
    return {
      key: field.key,
      label: field.label,
      component: "multiSelect",
      value,
      options,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
    };
  }

  if (field.component === "tags") {
    return {
      key: field.key,
      label: field.label,
      component: "tags",
      value,
      options,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
    };
  }

  if (field.component === "multiSelect") {
    return {
      key: field.key,
      label: field.label,
      component: "multiSelect",
      value,
      options,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
    };
  }

  if (field.component === "remoteTreeSelect") {
    return {
      key: field.key,
      label: field.label,
      component: "remoteTreeSelect",
      value,
      treeOptions,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
      searchValue,
      searchPlaceholder: `搜索${field.label}`,
    };
  }

  if (field.component === "treeMultiSelect") {
    return {
      key: field.key,
      label: field.label,
      component: "treeMultiSelect",
      value,
      treeOptions,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
    };
  }

  if (field.component === "user") {
    return {
      key: field.key,
      label: field.label,
      component: "user",
      value,
      options,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
      searchValue,
      searchPlaceholder: `搜索${field.label}`,
      user: field.user,
    };
  }

  if (
    field.remote?.source === "collaborators"
    && (field.component === "textarea" || field.component === "text")
  ) {
    return {
      key: field.key,
      label: field.label,
      component: "userMentionTextarea",
      value,
      options,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
      rows: field.component === "textarea" ? 4 : undefined,
      placeholder: field.placeholder,
      user: field.user,
    };
  }

  if (field.component === "remoteSelect") {
    return {
      key: field.key,
      label: field.label,
      component: "remoteSelect",
      value,
      options,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
      searchValue,
      searchPlaceholder: `搜索${field.label}`,
    };
  }

  if (field.component === "select") {
    return {
      key: field.key,
      label: field.label,
      component: "select",
      value,
      options,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
    };
  }

  if (
    field.component === "radioGroup" ||
    field.component === "checkboxGroup" ||
    field.component === "switch" ||
    field.component === "dateRange" ||
    field.component === "datetime" ||
    field.component === "dateTimeRange" ||
    field.component === "numberRange"
  ) {
    return {
      key: field.key,
      label: field.label,
      component: field.component,
      value,
      options,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
    };
  }

  if (field.component === "json" || field.component === "jsonEditor") {
    return {
      key: field.key,
      label: field.label,
      component: "jsonEditor",
      value,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
    };
  }

  if (field.component === "textarea" || field.component === "codeEditor") {
    return {
      key: field.key,
      label: field.label,
      component: field.component,
      value,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
    };
  }

  if (field.component === "richText") {
    return {
      key: field.key,
      label: field.label,
      component: "richText",
      value,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
      richText: field.richText,
    };
  }

  if (field.component === "fileUpload" || field.component === "imageUpload") {
    return {
      key: field.key,
      label: field.label,
      component: field.component,
      value,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
      upload: field.upload,
    };
  }

  if (field.component === "dictTagTone" || field.component === "dictTagClassName" || field.component === "dictTagPreview") {
    return {
      key: field.key,
      label: field.label,
      component: field.component,
      value,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
      disabled,
      error,
      uiVariant: "form",
    };
  }

  return {
    key: field.key,
    label: field.label,
    component: "text",
    value,
    placeholder: field.placeholder,
    description: field.description,
    required: field.required,
    disabled,
    error,
    uiVariant: "form",
    inputType: field.inputType ?? (field.component === "number" ? "number" : "text"),
  };
}
