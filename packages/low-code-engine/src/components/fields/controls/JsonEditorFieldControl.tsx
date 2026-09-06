"use client";

import { Braces, ChevronsDownUp, ChevronsUpDown, Wand2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { highlightJsonSource, type JsonTreeExpansionMode } from "./json-editor-support";
import { JsonTreeView } from "./JsonTreeView";
import { normalizeJsonFieldValue, parseJsonText, valueToJsonText } from "./json-field-utils";

export type JsonEditorValueMode = "string" | "value";

interface JsonEditorFieldControlProps {
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  /** string：提交格式化后的 JSON 字符串；value：提交解析后的对象 */
  valueMode?: JsonEditorValueMode;
  onChange: (value: unknown) => void;
}

function resolveReadonlyJsonValue(value: unknown): unknown {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "string") {
    const parsed = parseJsonText(value);
    return parsed.ok ? parsed.value : value;
  }
  return value;
}

function JsonHighlightedEditor({
  draft,
  placeholder,
  invalid,
  hintId,
  onDraftChange,
  onBlur,
}: {
  draft: string;
  placeholder?: string;
  invalid?: boolean;
  hintId: string;
  onDraftChange: (next: string) => void;
  onBlur: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const highlighted = useMemo(() => highlightJsonSource(draft), [draft]);

  function syncScroll() {
    if (!textareaRef.current || !highlightRef.current) {
      return;
    }
    highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
  }

  useEffect(() => {
    syncScroll();
  }, [draft]);

  return (
    <div className={cn("lh-json-editor-surface", invalid && "lh-json-editor-surface--invalid")}>
      <pre
        ref={highlightRef}
        className="lh-json-editor-highlight"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: `${highlighted}\n` }}
      />
      <textarea
        ref={textareaRef}
        rows={12}
        spellCheck={false}
        aria-invalid={invalid}
        aria-describedby={hintId}
        className="lh-json-editor-input"
        value={draft}
        placeholder={placeholder ?? "请输入 JSON，例如 {\"key\": \"value\"}"}
        onChange={(event) => onDraftChange(event.target.value)}
        onBlur={onBlur}
        onScroll={syncScroll}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            const target = event.currentTarget;
            const start = target.selectionStart ?? 0;
            const end = target.selectionEnd ?? 0;
            const next = `${draft.slice(0, start)}  ${draft.slice(end)}`;
            onDraftChange(next);
            requestAnimationFrame(() => {
              target.selectionStart = start + 2;
              target.selectionEnd = start + 2;
            });
          }
        }}
      />
    </div>
  );
}

export function JsonEditorFieldControl({
  value,
  placeholder,
  disabled,
  error,
  valueMode = "string",
  onChange,
}: JsonEditorFieldControlProps) {
  const hintId = useId();
  const [draft, setDraft] = useState(() => valueToJsonText(value));
  const [parseError, setParseError] = useState<string | null>(null);
  const [treeExpansionMode, setTreeExpansionMode] = useState<JsonTreeExpansionMode>("default");

  useEffect(() => {
    setDraft(valueToJsonText(value));
    setParseError(null);
  }, [value]);

  const invalid = Boolean(parseError || error);

  function commit(nextText: string, format = false): boolean {
    const result = parseJsonText(nextText);
    if (!result.ok) {
      setParseError(result.error);
      return false;
    }
    setParseError(null);
    const display = format || result.normalized !== "" ? result.normalized : "";
    setDraft(display);
    const emitted = normalizeJsonFieldValue(display === "" ? null : result.normalized, valueMode);
    onChange(emitted);
    return true;
  }

  function handleFormat() {
    commit(draft, true);
  }

  if (disabled) {
    const readonlyValue = resolveReadonlyJsonValue(value);
    return (
      <div className="lh-json-editor lh-json-editor--readonly">
        <div className="lh-json-editor-toolbar">
          <span className="lh-json-editor-mode-badge">
            <Braces className="h-3.5 w-3.5" />
            预览
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => setTreeExpansionMode("all")}>
            <ChevronsUpDown className="h-3.5 w-3.5" />
            展开全部
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setTreeExpansionMode("none")}>
            <ChevronsDownUp className="h-3.5 w-3.5" />
            收起全部
          </Button>
        </div>
        <div className="lh-json-editor-panel">
          <JsonTreeView value={readonlyValue} expansionMode={treeExpansionMode} />
        </div>
      </div>
    );
  }

  return (
    <div className="lh-json-editor">
      <div className="lh-json-editor-toolbar">
        <Button type="button" variant="outline" size="sm" onClick={handleFormat}>
          <Wand2 className="h-3.5 w-3.5" />
          格式化
        </Button>
        <span className="lh-json-editor-hint" id={hintId}>
          失焦时校验；Tab 插入两个空格
        </span>
      </div>

      <JsonHighlightedEditor
        draft={draft}
        placeholder={placeholder}
        invalid={invalid}
        hintId={hintId}
        onDraftChange={(next) => {
          setDraft(next);
          if (parseError) {
            setParseError(null);
          }
        }}
        onBlur={() => {
          commit(draft, false);
        }}
      />

      {parseError ? <p className="lh-json-editor-error">{parseError}</p> : null}
      {!parseError && error ? <p className="lh-json-editor-error">{error}</p> : null}
    </div>
  );
}
