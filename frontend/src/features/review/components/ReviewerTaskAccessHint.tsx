import { DismissibleHint } from "@/components/ui/dismissible-hint";
import { REVIEWER_TASK_ACCESS_HINT_STORAGE_KEY, REVIEWER_TASK_MEMBER_HINT } from "../utils/reviewer-task-access";

export interface ReviewerTaskAccessHintProps {
  className?: string;
  compact?: boolean;
}

export function ReviewerTaskAccessHint({ className, compact = false }: ReviewerTaskAccessHintProps) {
  return (
    <DismissibleHint storageKey={REVIEWER_TASK_ACCESS_HINT_STORAGE_KEY} className={className} compact={compact}>
      <p>{REVIEWER_TASK_MEMBER_HINT}</p>
    </DismissibleHint>
  );
}
