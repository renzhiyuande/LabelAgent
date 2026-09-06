import { AiQueuePanel } from "../../../components/AiQueuePanel";
import type { AiQueueWorkbenchBusinessContext } from "../../types";

export function AiQueueListPanelBody({ context }: { context: AiQueueWorkbenchBusinessContext }) {
  return (
    <AiQueuePanel
      rows={context.rows}
      currentId={context.currentId}
      statusFilter={context.statusFilter}
      loading={context.queueLoading}
      statusCounts={context.statusCounts}
      queueStats={context.queueStats}
      statsLoading={context.statsLoading}
      onStatusFilterChange={context.onStatusFilterChange}
      onSelectItem={context.onSelectItem}
    />
  );
}
