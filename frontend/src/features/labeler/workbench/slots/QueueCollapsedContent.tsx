import { QueueCollapsedRail } from "../chrome/QueueCollapsedRail";
import type { LabelerWorkbenchBusinessContext } from "../types";

export function QueueCollapsedContent({ context }: { context: LabelerWorkbenchBusinessContext }) {
  return <QueueCollapsedRail context={context} />;
}
