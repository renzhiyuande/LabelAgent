import type { ComponentType } from "react";
import type { WorkflowActionMeta, ResourceMeta } from "../schema/types";
import type { ResourceListScope } from "../utils/list-scope";
import type { ResourceRecord } from "../types";

export interface WorkflowRendererProps {
  workflow: WorkflowActionMeta;
  resource: ResourceMeta;
  actionKey: string;
  record?: ResourceRecord | null;
  /** 表格多选批量 workflow 时传入的选中行 */
  selectedRecords?: ResourceRecord[];
  scope?: ResourceListScope;
  close: () => void;
  refresh: () => Promise<void>;
}

export type WorkflowRenderer = ComponentType<WorkflowRendererProps>;

const workflowRendererRegistry = new Map<string, WorkflowRenderer>();

export function registerWorkflowRenderer(code: string, renderer: WorkflowRenderer) {
  workflowRendererRegistry.set(code, renderer);
}

export function resolveWorkflowRenderer(code?: string): WorkflowRenderer | undefined {
  if (!code) {
    return undefined;
  }
  return workflowRendererRegistry.get(code);
}

