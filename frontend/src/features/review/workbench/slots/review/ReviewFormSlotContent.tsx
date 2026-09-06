import type { ReactNode } from "react";
import { Check, PenLine, RotateCcw, X } from "lucide-react";
import { appMessage } from "@/lib/message";
import { cn } from "@/lib/utils";
import { getReviewActionBlockReason } from "../../../utils/review-action-guard";
import { ReviewSlotFrame } from "../../ReviewSlotFrame";
import { ReviewSlotWidgetBoard } from "../../chrome/ReviewSlotWidgetBoard";
import type { ReviewSlotRenderEnv, ReviewWorkbenchBusinessContext } from "../../types";

export function ReviewFormSlotContent({
  context,
  env,
}: {
  context: ReviewWorkbenchBusinessContext;
  env: ReviewSlotRenderEnv;
}) {
  return (
    <ReviewSlotFrame
      slotId="review"
      title="审核操作"
      description="填写审核意见并执行通过、驳回或打回。"
      env={env}
      controls={context}
      flush
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <ReviewSlotWidgetBoard boardId="review" context={context} />
      </div>
    </ReviewSlotFrame>
  );
}

function runCollapsedReviewAction(context: ReviewWorkbenchBusinessContext, action: () => void) {
  const blockReason = getReviewActionBlockReason(context);
  if (blockReason) {
    appMessage.info(blockReason);
    return;
  }
  action();
}

export function ReviewFormCollapsedContent({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const blockReason = getReviewActionBlockReason(context);
  const blocked = blockReason !== null;

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1 py-2 lh-workbench-rail-scroll">
      <PenLine className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <CollapsedReviewActionButton
        title={blocked && blockReason ? blockReason : "通过"}
        blocked={blocked}
        className="border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200"
        onClick={() => runCollapsedReviewAction(context, context.onApprove)}
      >
        <Check className="h-4 w-4" />
      </CollapsedReviewActionButton>
      <CollapsedReviewActionButton
        title={blocked && blockReason ? blockReason : "驳回"}
        blocked={blocked}
        className="border-red-200/80 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
        onClick={() => runCollapsedReviewAction(context, context.onReject)}
      >
        <X className="h-4 w-4" />
      </CollapsedReviewActionButton>
      <CollapsedReviewActionButton
        title={blocked && blockReason ? blockReason : "打回修改"}
        blocked={blocked}
        className="border-slate-200/80 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        onClick={() => runCollapsedReviewAction(context, context.onReturn)}
      >
        <RotateCcw className="h-4 w-4" />
      </CollapsedReviewActionButton>
    </div>
  );
}

function CollapsedReviewActionButton({
  title,
  blocked,
  className,
  onClick,
  children,
}: {
  title: string;
  blocked: boolean;
  className: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-disabled={blocked}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition",
        blocked ? "cursor-not-allowed opacity-45" : "hover:brightness-95",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
