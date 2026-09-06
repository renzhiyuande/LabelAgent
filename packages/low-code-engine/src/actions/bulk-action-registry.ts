import type { EngineBulkActionRequest } from "../types";

export type BulkResourceActionHandler = (request: EngineBulkActionRequest) => Promise<void>;

const bulkActionRegistry = new Map<string, BulkResourceActionHandler>();

function registryKey(resource: string, actionKey: string): string {
  return `${resource}:${actionKey}`;
}

export function registerBulkResourceAction(
  resource: string,
  actionKey: string,
  handler: BulkResourceActionHandler,
) {
  bulkActionRegistry.set(registryKey(resource, actionKey), handler);
}

export function unregisterBulkResourceAction(resource: string, actionKey: string) {
  bulkActionRegistry.delete(registryKey(resource, actionKey));
}

export function resolveBulkResourceAction(
  resource: string,
  actionKey: string,
): BulkResourceActionHandler | undefined {
  return bulkActionRegistry.get(registryKey(resource, actionKey));
}
