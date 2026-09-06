import { useCan } from "@refinedev/core";
import type { ResourceMeta } from "../schema/types";

export function useResourceCan(
  resource: ResourceMeta,
  action: string,
  permission?: string | string[],
) {
  return useCan({
    resource: resource.resource,
    action,
    params: permission ? { permission } : undefined,
  });
}
