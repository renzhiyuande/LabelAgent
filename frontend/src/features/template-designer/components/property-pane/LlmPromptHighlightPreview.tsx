"use client";

import { cn } from "@/lib/utils";

const VARIABLE_PATTERN = /「[^」]+」/g;

interface LlmPromptHighlightPreviewProps {
  value: string;
  className?: string;
}

/** 将编辑区中的「字段名」渲染为高亮标签预览 */
export function LlmPromptHighlightPreview({ value, className }: LlmPromptHighlightPreviewProps) {
  if (!value.trim()) {
    return null;
  }

  const parts: Array<{ type: "text" | "variable"; content: string }> = [];
  let lastIndex = 0;
  for (const match of value.matchAll(VARIABLE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", content: value.slice(lastIndex, index) });
    }
    parts.push({ type: "variable", content: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < value.length) {
    parts.push({ type: "text", content: value.slice(lastIndex) });
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 text-xs leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
        className,
      )}
    >
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">预览</p>
      <p className="whitespace-pre-wrap break-words">
        {parts.map((part, index) =>
          part.type === "variable" ? (
            <span
              key={`${part.content}-${index}`}
              className="mx-0.5 inline-flex rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100"
            >
              {part.content}
            </span>
          ) : (
            <span key={`text-${index}`}>{part.content}</span>
          ),
        )}
      </p>
    </div>
  );
}
