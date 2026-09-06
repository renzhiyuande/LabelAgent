import type { ReactNode } from "react";
import type { FormSchema } from "@/low-code/schema/types";
import type { SchemaDataViewMode } from "../schema-data/SchemaDataView";

export interface WorkbenchPanelSectionRenderContext {
  viewMode: SchemaDataViewMode;
}

export interface WorkbenchPanelSectionDefinition {
  id: string;
  title: string;
  data?: Record<string, unknown>;
  schema?: FormSchema | null;
  emptyMessage?: string;
  hideViewToggle?: boolean;
  headerExtra?: ReactNode;
  /** 正文顶部附加内容（如打回意见提示），不占用标题栏空间 */
  bodyLead?: ReactNode;
  /** 返回 null/undefined 时回退到 SchemaDataView */
  renderBody?: (context: WorkbenchPanelSectionRenderContext) => ReactNode | null;
}

/** @deprecated 使用 WorkbenchPanelSectionDefinition */
export type WorkbenchSchemaDataSectionDefinition = WorkbenchPanelSectionDefinition;
