import type { ReviewWorkbenchBusinessContext } from "../../types";

export function ReviewCommentPanelBody({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const disabled = !context.detail || context.saving;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain p-4">
      <label className="block text-xs font-medium text-muted-foreground" htmlFor="review-comment">
        审核意见
      </label>
      <textarea
        id="review-comment"
        className="mt-2 min-h-[160px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm leading-6 text-foreground outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2"
        placeholder="填写通过说明、驳回原因或打回修改建议…"
        value={context.comment}
        disabled={disabled}
        onChange={(event) => context.onCommentChange(event.target.value)}
      />
    </div>
  );
}
