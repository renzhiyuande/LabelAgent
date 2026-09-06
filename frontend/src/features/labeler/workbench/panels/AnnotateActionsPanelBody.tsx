import { RotateCcw, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LabelerWorkbenchBusinessContext } from "../types";

export function AnnotateActionsPanelBody({ context }: { context: LabelerWorkbenchBusinessContext }) {
  const canWithdraw = context.work.submission.canWithdraw;

  return (
    <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl sm:w-auto"
        disabled={context.saving || context.contentPendingOnly}
        onClick={context.onSaveDraft}
      >
        <Save className="mr-1.5 h-4 w-4" />
        {context.saving ? "保存中…" : "保存草稿"}
      </Button>
      {context.canSubmit ? (
        <Button
          type="submit"
          form="labeler-work-form"
          className="w-full rounded-xl sm:w-auto"
          disabled={context.submitting || context.contentPendingOnly}
        >
          <Send className="mr-1.5 h-4 w-4" />
          {context.submitting ? "提交中…" : "正式提交"}
        </Button>
      ) : (
        <p className="text-center text-xs text-slate-500 sm:text-right dark:text-slate-400">
          当前题目不可提交
        </p>
      )}
      {canWithdraw ? (
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 sm:w-auto dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950"
          disabled={context.submitting}
          onClick={() => void context.onWithdraw()}
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          撤回提交
        </Button>
      ) : null}
    </div>
  );
}
