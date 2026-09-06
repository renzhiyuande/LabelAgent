import type { ActionSchema, ResourceMeta } from "../schema/types";

export function resolveAction(resource: ResourceMeta, key: string): ActionSchema | undefined {
  return resource.actions?.find((action) => action.key === key);
}
