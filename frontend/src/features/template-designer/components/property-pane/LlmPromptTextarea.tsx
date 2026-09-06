"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatLlmTemplateVariable, insertTextAtCursor } from "../../utils/llm-prompt-insert";

export type LlmPromptInsertTarget = "system" | "user";

export interface LlmPromptTextareaHandle {
  insertVariable: (path: string) => void;
  focus: () => void;
}

interface LlmPromptTextareaProps {
  label: string;
  target: LlmPromptInsertTarget;
  activeTarget: LlmPromptInsertTarget;
  value: string;
  rows?: number;
  placeholder?: string;
  /** 将字段 path 转为插入到编辑区的文本（默认 {{path}}） */
  formatInsertToken?: (path: string) => string;
  onFocusTarget: (target: LlmPromptInsertTarget) => void;
  onChange: (value: string) => void;
}

export const LlmPromptTextarea = forwardRef<LlmPromptTextareaHandle, LlmPromptTextareaProps>(
  function LlmPromptTextarea(
    { label, target, activeTarget, value, rows = 4, placeholder, formatInsertToken, onFocusTarget, onChange },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [pendingCursor, setPendingCursor] = useState<number | null>(null);
    const isActive = activeTarget === target;

    useEffect(() => {
      if (pendingCursor == null || !textareaRef.current) {
        return;
      }
      const element = textareaRef.current;
      element.focus();
      element.setSelectionRange(pendingCursor, pendingCursor);
      setPendingCursor(null);
    }, [pendingCursor, value]);

    function insertVariable(path: string) {
      const token = formatInsertToken ? formatInsertToken(path) : formatLlmTemplateVariable(path);
      onFocusTarget(target);

      const element = textareaRef.current;
      const current = value;
      if (!element) {
        onChange(`${current}${token}`);
        return;
      }

      const { text, cursor } = insertTextAtCursor(
        current,
        element.selectionStart ?? current.length,
        element.selectionEnd ?? element.selectionStart ?? current.length,
        token,
      );
      onChange(text);
      setPendingCursor(cursor);
    }

    useImperativeHandle(ref, () => ({
      insertVariable,
      focus: () => textareaRef.current?.focus(),
    }));

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
          {isActive ? (
            <span className="text-[10px] text-sky-600 dark:text-sky-400">当前编辑区</span>
          ) : null}
        </div>

        <Textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          placeholder={placeholder}
          className={cn(
            "min-h-0 resize-y",
            isActive && "ring-2 ring-sky-500/40 dark:ring-sky-400/30",
          )}
          onFocus={() => onFocusTarget(target)}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  },
);
