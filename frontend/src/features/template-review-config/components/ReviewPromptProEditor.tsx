"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import { Braces, Database, ListPlus, Redo2, Undo2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewDimensionItem } from "@/features/template-designer/types/review-dimension";
import { usePromptEditorHistory } from "../hooks/use-prompt-editor-history";
import { buildReviewPromptFromDimensions } from "../utils/review-prompt-builder";
import {
  applyMentionSelection,
  detectMention,
  filterVariablesForMention,
  findVariableTokenRange,
  replaceOrInsertDataBlock,
  replaceOrInsertDimensionBlock,
  segmentPromptForHighlight,
} from "../utils/review-prompt-editor-utils";
import {
  formatReviewPromptTemplate,
  insertTextAtSelection,
  listReviewPromptVariableGroups,
  listReviewPromptVariables,
} from "../utils/review-prompt-variables";

interface ReviewPromptProEditorProps {
  value: string;
  editable: boolean;
  dimensions: ReviewDimensionItem[];
  onChange: (value: string) => void;
}

export function ReviewPromptProEditor({
  value,
  editable,
  dimensions,
  onChange,
}: ReviewPromptProEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { draft, commit, undo, redo, canUndo, canRedo } = usePromptEditorHistory(value);
  const [cursor, setCursor] = useState(0);
  const [mentionIndex, setMentionIndex] = useState(0);

  const variableGroups = useMemo(() => listReviewPromptVariableGroups(dimensions), [dimensions]);
  const allVariables = useMemo(() => listReviewPromptVariables(dimensions), [dimensions]);
  const highlightSegments = useMemo(() => segmentPromptForHighlight(draft), [draft]);

  const mention = useMemo(
    () => (editable ? detectMention(draft, cursor) : null),
    [cursor, draft, editable],
  );

  const mentionCandidates = useMemo(
    () => (mention ? filterVariablesForMention(allVariables, mention.query) : []),
    [allVariables, mention],
  );

  useEffect(() => {
    setMentionIndex(0);
  }, [mention?.query, mentionCandidates.length]);

  const applyDraft = useCallback(
    (nextValue: string, nextCursor: number, message?: string, recordHistory = true) => {
      commit(nextValue, { recordHistory });
      onChange(nextValue);
      setCursor(nextCursor);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) {
          return;
        }
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      });
      if (message) {
        toast.success(message);
      }
    },
    [commit, onChange],
  );

  const insertSnippet = useCallback(
    (snippet: string, message?: string) => {
      if (!editable) {
        return;
      }
      const textarea = textareaRef.current;
      if (!textarea) {
        applyDraft(`${draft}${snippet}`, `${draft}${snippet}`.length, message);
        return;
      }
      const { nextValue, cursor: nextCursor } = insertTextAtSelection(
        draft,
        textarea.selectionStart,
        textarea.selectionEnd,
        snippet,
      );
      applyDraft(nextValue, nextCursor, message);
    },
    [applyDraft, draft, editable],
  );

  const selectMention = useCallback(
    (token: string) => {
      if (!mention) {
        return;
      }
      const { nextValue, cursor: nextCursor } = applyMentionSelection(draft, mention, cursor, token);
      applyDraft(nextValue, nextCursor);
    },
    [applyDraft, cursor, draft, mention],
  );

  function handleFormat() {
    if (!editable) {
      return;
    }
    const formatted = formatReviewPromptTemplate(draft);
    applyDraft(formatted, formatted.length, "已格式化 Prompt");
  }

  function handleInsertAllDimensionSlots() {
    if (dimensions.every((item) => !item.dimensionName.trim())) {
      toast.error("请先配置至少一个带名称的维度");
      return;
    }
    const { text, replaced } = replaceOrInsertDimensionBlock(draft, dimensions);
    const textarea = textareaRef.current;
    const nextCursor = textarea?.selectionStart ?? Math.min(cursor, text.length);
    applyDraft(text, nextCursor, replaced ? "已更新维度块" : "已插入维度块");
  }

  function handleInsertDataBlock() {
    const { text, replaced } = replaceOrInsertDataBlock(draft);
    const textarea = textareaRef.current;
    const nextCursor = textarea?.selectionStart ?? Math.min(cursor, text.length);
    applyDraft(text, nextCursor, replaced ? "已更新数据变量块" : "已插入数据变量块");
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextValue = event.target.value;
    const nextCursor = event.target.selectionStart ?? nextValue.length;
    setCursor(nextCursor);
    applyDraft(nextValue, nextCursor, undefined, true);
  }

  function handleSelect(event: SyntheticEvent<HTMLTextAreaElement>) {
    setCursor(event.currentTarget.selectionStart ?? 0);
  }

  function handleUndo() {
    const previous = undo();
    if (previous === null) {
      return;
    }
    onChange(previous);
    setCursor(textareaRef.current?.selectionStart ?? previous.length);
  }

  function handleRedo() {
    const next = redo();
    if (next === null) {
      return;
    }
    onChange(next);
    setCursor(textareaRef.current?.selectionStart ?? next.length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!editable) {
      return;
    }

    const isMeta = event.metaKey || event.ctrlKey;
    if (isMeta && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }
    if (isMeta && event.key.toLowerCase() === "y") {
      event.preventDefault();
      handleRedo();
      return;
    }

    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    setCursor(selectionStart);

    if (mention && mentionCandidates.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((current) => (current + 1) % mentionCandidates.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex(
          (current) => (current - 1 + mentionCandidates.length) % mentionCandidates.length,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        selectMention(mentionCandidates[mentionIndex]?.token ?? mentionCandidates[0].token);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        const nextValue = draft.slice(0, mention.start) + draft.slice(selectionStart);
        applyDraft(nextValue, mention.start);
        return;
      }
    }

    if (selectionStart !== selectionEnd) {
      return;
    }

    if (event.key === "Backspace") {
      const range = findVariableTokenRange(draft, selectionStart, "backspace");
      if (range) {
        event.preventDefault();
        const [start, end] = range;
        applyDraft(draft.slice(0, start) + draft.slice(end), start);
      }
      return;
    }

    if (event.key === "Delete") {
      const range = findVariableTokenRange(draft, selectionStart, "delete");
      if (range) {
        event.preventDefault();
        const [start, end] = range;
        applyDraft(draft.slice(0, start) + draft.slice(end), start);
      }
    }
  }

  return (
    <section className="lh-review-prompt-section px-6 py-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Prompt 模板（专业）</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            输入 <code>@</code> 插入变量；支持 <code>⌘Z</code> 撤销
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!editable || !canUndo}
            onClick={handleUndo}
            title="撤销 (⌘Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!editable || !canRedo}
            onClick={handleRedo}
            title="重做 (⌘⇧Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={!editable}>
                <Braces className="mr-1.5 h-4 w-4" />
                插入变量
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
              {Array.from(variableGroups.entries()).map(([group, variables], groupIndex) => (
                <DropdownMenuGroup key={group}>
                  {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{group}</DropdownMenuLabel>
                  {variables.map((variable) => (
                    <DropdownMenuItem
                      key={`${group}-${variable.token}`}
                      className="flex flex-col items-start gap-0.5 py-2"
                      onClick={() => insertSnippet(variable.token)}
                    >
                      <span className="text-sm font-medium">{variable.label}</span>
                      <code className="text-[10px] text-muted-foreground">{variable.token}</code>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!editable || dimensions.length === 0}
            onClick={handleInsertAllDimensionSlots}
          >
            <ListPlus className="mr-1.5 h-4 w-4" />
            导入维度块
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!editable}
            onClick={handleInsertDataBlock}
          >
            <Database className="mr-1.5 h-4 w-4" />
            导入数据块
          </Button>

          <Button type="button" variant="outline" size="sm" disabled={!editable} onClick={handleFormat}>
            <Wand2 className="mr-1.5 h-4 w-4" />
            格式化
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!editable}
            onClick={() => applyDraft(buildReviewPromptFromDimensions(dimensions), draft.length)}
          >
            按维度重新生成
          </Button>
        </div>
      </div>

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={draft}
          disabled={!editable}
          rows={14}
          spellCheck={false}
          className="min-h-[352px] resize-y font-mono text-xs leading-5"
          placeholder="审核 Prompt 模板"
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
        />

        {mention && mentionCandidates.length > 0 ? (
          <div className="lh-review-prompt-mention-panel absolute bottom-3 left-3 z-10 max-h-48 w-72 overflow-y-auto rounded-md py-1">
            {mentionCandidates.map((variable, index) => (
              <button
                key={variable.token}
                type="button"
                className={`lh-review-prompt-mention-item flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                  index === mentionIndex ? "is-active" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectMention(variable.token);
                }}
              >
                <span className="text-sm font-medium text-foreground">{variable.label}</span>
                <code className="text-[10px] text-muted-foreground">{variable.token}</code>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div aria-hidden className="lh-review-prompt-preview mt-2">
        {highlightSegments.map((segment, index) =>
          segment.type === "variable" ? (
            <span key={`${index}-${segment.content}`} className="lh-review-prompt-variable">
              {segment.content}
            </span>
          ) : (
            <span key={`${index}-text`} className="lh-review-prompt-preview-text">
              {segment.content}
            </span>
          ),
        )}
      </div>

      <p className="lh-review-prompt-hint">
        变量高亮见下方预览；「导入维度块」会清除所有含{" "}
        <code>{"{{dimension.*.prompt_instruction}}"}</code> 的行后再写入，避免重复。
      </p>
    </section>
  );
}
