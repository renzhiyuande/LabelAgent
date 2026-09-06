import { LHDrawerShell } from "@/low-code/components/drawers/LHDrawerShell";
import type { LabelerQueueScope, LabelerQueueScopeItem } from "../types/labeler-queue-scope";
import { LabelerTaskBrowsePanel } from "./LabelerTaskBrowsePanel";

export interface LabelerTaskBrowseDrawerProps {
  open: boolean;
  onClose: () => void;
  activeScope: LabelerQueueScope | null;
  onApplyScope: (items: LabelerQueueScopeItem[]) => void;
}

export function LabelerTaskBrowseDrawer({
  open,
  onClose,
  activeScope,
  onApplyScope,
}: LabelerTaskBrowseDrawerProps) {
  return (
    <LHDrawerShell
      open={open}
      onClose={onClose}
      title="选择任务范围"
      description="支持多选任务；确认后按所选任务聚合题目队列，并可用状态筛选。"
      width="lg"
      placement="left"
    >
      <LabelerTaskBrowsePanel
        initialSelectedTaskIds={activeScope?.items.map((item) => item.taskId) ?? []}
        onApplySelection={(items) => {
          onApplyScope(items);
          onClose();
        }}
      />
    </LHDrawerShell>
  );
}
