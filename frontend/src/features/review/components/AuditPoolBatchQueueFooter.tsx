import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatApproveActionLabel } from "../utils/review-stage";

export interface AuditPoolBatchQueueFooterProps {
  selectedCount: number;
  reviewLevelLabel: string;
  isFinalLevel: boolean;
  batchComment: string;
  batchSubmitting?: boolean;
  onBatchCommentChange: (value: string) => void;
  onSelectAllPending: () => void;
  onClearSelection: () => void;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onBatchReturn: () => void;
}

export function AuditPoolBatchQueueFooter({
  selectedCount,
  reviewLevelLabel,
  isFinalLevel,
  batchComment,
  batchSubmitting,
  onBatchCommentChange,
  onSelectAllPending,
  onClearSelection,
  onBatchApprove,
  onBatchReject,
  onBatchReturn,
}: AuditPoolBatchQueueFooterProps) {
  if (selectedCount === 0) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>勾选待审条目后可批量操作（须为当前审核级）</span>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSelectAllPending}>
          全选本页待审
        </Button>
      </div>
    );
  }

  const approveLabel = formatApproveActionLabel(isFinalLevel);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          已选 {selectedCount} 条 · {reviewLevelLabel}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSelectAllPending}>
            全选待审
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearSelection}>
            清空
          </Button>
        </div>
      </div>
      <Textarea
        value={batchComment}
        rows={2}
        placeholder="批量审核意见（必填）"
        className="min-h-[60px] resize-none text-sm"
        onChange={(event) => onBatchCommentChange(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={batchSubmitting} onClick={onBatchApprove}>
          {batchSubmitting ? "提交中…" : `批量${approveLabel}`}
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={batchSubmitting} onClick={onBatchReject}>
          批量驳回
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={batchSubmitting} onClick={onBatchReturn}>
          批量打回
        </Button>
      </div>
    </div>
  );
}
