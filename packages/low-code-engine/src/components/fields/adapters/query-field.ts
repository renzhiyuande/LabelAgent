"use client";

import type { FilterFieldSchema } from "../../../schema/types";
import type { BaseFieldViewModel } from "../types";

export function defaultFilterValue(field: FilterFieldSchema): unknown {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  if (field.component === "multiSelect" || field.component === "tags") {
    return [];
  }
  if (
    field.component === "dateRange" ||
    field.component === "dateTimeRange" ||
    field.component === "numberRange"
  ) {
    return ["", ""];
  }
  return "";
}

export function toQueryFieldViewModel(
  field: FilterFieldSchema,
  value: unknown,
  options: FilterFieldSchema["options"] = [],
  searchValue = "",
): BaseFieldViewModel {
  if (field.component === "remoteSelect") {
    return {
      key: field.key,
      label: field.label,
      component: "remoteSelect",
      options: options ?? [],
      placeholder: field.placeholder ?? `请选择${field.label}`,
      value,
      searchValue,
      searchPlaceholder: `搜索${field.label}`,
      uiVariant: "query",
    };
  }

  if (field.component === "statusSelect") {
    return {
      key: field.key,
      label: field.label,
      component: "select",
      value,
      options,
      placeholder: "全部",
      uiVariant: "query",
    };
  }

  if (field.component === "select") {
    return {
      key: field.key,
      label: field.label,
      component: "select",
      value,
      options,
      placeholder: "全部",
      uiVariant: "query",
    };
  }

  if (field.component === "multiSelect" || field.component === "tags") {
    return {
      key: field.key,
      label: field.label,
      component: field.component === "tags" ? "tags" : "multiSelect",
      value,
      options,
      uiVariant: "query",
    };
  }

  if (
    field.component === "numberRange" ||
    field.component === "dateRange" ||
    field.component === "dateTimeRange"
  ) {
    return {
      key: field.key,
      label: field.label,
      component: field.component,
      value,
      placeholder: field.placeholder,
      uiVariant: "query",
    };
  }

  return {
    key: field.key,
    label: field.label,
    component: "text",
    value,
    placeholder: field.placeholder,
    uiVariant: "query",
  };
}
