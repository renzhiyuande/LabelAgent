import type { ReactNode } from "react";
import type { WorkflowActionMeta } from "../../schema/types";
import { LHDrawerShell } from "./LHDrawerShell";

interface LHWorkflowDrawerProps {
  open: boolean;
  onClose: () => void;
  workflow: WorkflowActionMeta;
  fallbackTitle: string;
  fallbackDescription?: string;
  children: ReactNode;
}

export function LHWorkflowDrawer({
  open,
  onClose,
  workflow,
  fallbackTitle,
  fallbackDescription,
  children,
}: LHWorkflowDrawerProps) {
  return (
    <LHDrawerShell
      open={open}
      onClose={onClose}
      title={workflow.title ?? fallbackTitle}
      description={workflow.description ?? fallbackDescription}
      width={workflow.width ?? "xl"}
      placement={workflow.placement ?? "right"}
    >
      {children}
    </LHDrawerShell>
  );
}

