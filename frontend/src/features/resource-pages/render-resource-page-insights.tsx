import type { ResourceMeta } from "@/low-code";
import type { ResourceRecord } from "@/low-code/types";
import { ResourcePageInsightsPanel } from "./ResourcePageInsightsPanel";

interface RenderResourcePageInsightsArgs {
  resource: ResourceMeta;
  records: ResourceRecord[];
  loading?: boolean;
  refreshing?: boolean;
}

export function renderResourcePageInsights({
  resource,
  records,
  loading = false,
  refreshing = false,
}: RenderResourcePageInsightsArgs) {
  const summary = resource.page?.summary;

  if (!summary) {
    return null;
  }

  return (
    <ResourcePageInsightsPanel
      resourceKey={resource.resource}
      summary={summary}
      records={records}
      loading={loading}
      refreshing={refreshing}
    />
  );
}
