"use client";

import type {
  DetailFieldType,
  OptionItem,
  UploadFieldMeta,
  LlmFieldMeta,
  RichTextFieldMeta,
  ShowItemFieldMeta,
  ShowImageFieldMeta,
  ShowFileFieldMeta,
  ShowVideoFieldMeta,
  UserFieldMeta,
  FormFieldComponent,
} from "../../schema/types";
import type { TreeOptionNode } from "../../adapters/tree-options";

/** FieldControlRenderer 直接支持的控件子集（不含 engine/adapter 层处理的 number / array / remoteSchema） */
export type SharedFieldComponent = Exclude<FormFieldComponent, "number" | "array" | "remoteSchema" | "dynamicTable">;

export interface BaseFieldViewModel {
  key: string;
  label: string;
  component: SharedFieldComponent;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  value: unknown;
  options?: OptionItem[];
  treeOptions?: TreeOptionNode[];
  multiple?: boolean;
  error?: string;
  uiVariant: "form" | "query" | "table";
  inputType?: "text" | "number" | "password";
  rows?: number;
  searchValue?: string;
  searchPlaceholder?: string;
  formatter?: string;
  displayType?: DetailFieldType;
  showItem?: ShowItemFieldMeta;
  showImage?: ShowImageFieldMeta;
  showFile?: ShowFileFieldMeta;
  showVideo?: ShowVideoFieldMeta;
  richText?: RichTextFieldMeta;
  upload?: UploadFieldMeta;
  llm?: LlmFieldMeta;
  /** LLM 推荐等控件读取整表上下文 */
  formValues?: Record<string, unknown>;
  itemPayload?: Record<string, unknown>;
  displaySchema?: import("../../schema/types").FormSchema;
  /** 模板版本 ID（设计器预览 / 标注工作台） */
  templateVersionId?: string | number;
  /** 持久化用字段编码（一般为 path） */
  fieldCode?: string;
  assignmentId?: string | number;
  submissionId?: string | number;
  taskId?: string | number;
  /** 设计器预览样本题目 ID，供 llmSuggest preview 接口加载题面 */
  taskItemId?: string | number;
  user?: UserFieldMeta;
  /** 为 false 时禁用 LLM 生成按钮（如提交不可编辑） */
  llmSuggestInvokeAllowed?: boolean;
  /** 表单 user 控件：来自 nameField 的展示名（如 labelerName） */
  userDisplayName?: string | null;
}

export interface SharedFieldHandlers {
  onChange: (value: unknown) => void;
  onSearchChange?: (value: string) => void;
  /** Agent 模式：将结构化建议写入其它标注字段 */
  onApplyFieldValues?: (updates: Array<{ path: string; value: unknown }>) => void;
}
