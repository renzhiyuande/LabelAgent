import { useState } from "react";
import type { ReviewWorkbenchBusinessContext } from "../../types";

const PAGE_SIZE = 20;

export function HistoryListPanelBody({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const comments = context.historyComments;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = comments.slice(0, visibleCount);

  return (
    <div className="max-h-full space-y-2 overflow-y-auto px-2 py-2">
      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">暂无历史审核记录</p>
      ) : (
        <>
          {visible.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-200/80 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.reviewer}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.comment}</p>
              <p className="mt-1 text-[11px] text-slate-400">{item.at}</p>
            </div>
          ))}
          {visibleCount < comments.length && (
            <button
              className="w-full rounded-md py-1.5 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              加载更多（{comments.length - visibleCount} 条）
            </button>
          )}
        </>
      )}
    </div>
  );
}
