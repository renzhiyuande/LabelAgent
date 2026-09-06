import { Button } from "@/components/ui/button";
import { isReviewActionBlocked } from "../../../utils/review-action-guard";
import { formatApproveActionLabel } from "../../../utils/review-stage";
import type { ReviewWorkbenchBusinessContext } from "../../types";

export function ReviewActionsPanelBody({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const disabled = isReviewActionBlocked(context);
  const approveLabel = formatApproveActionLabel(context.detail?.isFinalReviewLevel ?? false);

  return (
    <div className="shrink-0 flex flex-wrap gap-2 border-t border-slate-200/80 px-2 py-2 dark:border-slate-800">
      <Button type="button" disabled={disabled} onClick={context.onApprove}>
        {context.saving ? "处理中…" : approveLabel}
        {!context.saving ? <HotkeyHint keys="A" /> : null}
      </Button>
      <Button type="button" variant="destructive" disabled={disabled} onClick={context.onReject}>
        驳回
        {!context.saving ? <HotkeyHint keys="R" /> : null}
      </Button>
      <Button type="button" variant="outline" disabled={disabled} onClick={context.onReturn}>
        打回修改
        {!context.saving ? <HotkeyHint keys="T" /> : null}
      </Button>
    </div>
  );
}

function HotkeyHint({ keys }: { keys: string }) {
  return (
    <span className="ml-1.5 text-[10px] font-normal tracking-wide text-muted-foreground/80">
      ({keys})
    </span>
  );
}
