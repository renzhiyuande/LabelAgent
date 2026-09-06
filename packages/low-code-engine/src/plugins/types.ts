import type { BulkResourceActionHandler } from "../actions/bulk-action-registry";
import type { HeaderActionHandler, ResourceActionHandler } from "../actions/registry";

export interface LowCodePluginHeaderActionsApi {
  register(code: string, handler: HeaderActionHandler): void;
  unregister(code: string): void;
  resolve(code?: string): HeaderActionHandler | undefined;
}

export interface LowCodePluginResourceActionsApi {
  register(code: string, handler: ResourceActionHandler): void;
  unregister(code: string): void;
  resolve(code?: string): ResourceActionHandler | undefined;
}

export interface LowCodePluginBulkActionsApi {
  register(resource: string, actionKey: string, handler: BulkResourceActionHandler): void;
  unregister(resource: string, actionKey: string): void;
  resolve(resource: string, actionKey: string): BulkResourceActionHandler | undefined;
}

export interface LowCodePluginApi {
  headerActions: LowCodePluginHeaderActionsApi;
  resourceActions: LowCodePluginResourceActionsApi;
  bulkActions: LowCodePluginBulkActionsApi;
}

export interface LowCodePlugin {
  pluginId: string;
  setup(api: LowCodePluginApi): void;
}
