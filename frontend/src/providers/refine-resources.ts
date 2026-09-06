import type { ResourceProps } from "@refinedev/core";
import { getRegisteredResourceKeys, getResourceMeta } from "@labelhub/low-code-engine";

export function buildRefineResources(): ResourceProps[] {
  return getRegisteredResourceKeys().map((key) => {
    const meta = getResourceMeta(key)!;
    return {
      name: meta.resource,
      meta: {
        label: meta.label,
        resourceKey: key,
      },
    };
  });
}
