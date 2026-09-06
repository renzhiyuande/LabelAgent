import type { LabelerWorkbenchBusinessContext } from "../types";
import { LabelerWorkbenchSettingsPanel } from "../chrome/LabelerWorkbenchSettingsPanel";

export function ToolbarPopoverContent({
  context,
  onToggleEditMode,
  onResetWorkbench,
}: {
  context: LabelerWorkbenchBusinessContext;
  onToggleEditMode: () => void;
  onResetWorkbench: () => void;
}) {
  return (
    <LabelerWorkbenchSettingsPanel
      context={context}
      onToggleEditMode={onToggleEditMode}
      onResetWorkbench={onResetWorkbench}
    />
  );
}
