"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Textarea } from '../../../components/ui/textarea';
import { useUserMentionOptions } from "../../../hooks/use-user-mention-options";
import type { OptionItem } from "../../../schema/types";

interface UserMentionTextareaFieldControlProps {
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  mentionOptions?: OptionItem[];
  enableUserMention?: boolean;
  onChange: (value: string) => void;
  onMentionSearch?: (keyword: string) => void;
}

export function UserMentionTextareaFieldControl({
  value,
  placeholder,
  disabled,
  rows,
  className,
  mentionOptions,
  enableUserMention = true,
  onChange,
  onMentionSearch,
}: UserMentionTextareaFieldControlProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const text = String(value ?? "");
  const useRemoteMention = onMentionSearch != null;

  const fetchedOptions = useUserMentionOptions(
    mentionQuery,
    enableUserMention && mentionOpen && !useRemoteMention,
  );

  const effectiveOptions = useRemoteMention ? (mentionOptions ?? []) : fetchedOptions;

  const filteredOptions = useMemo(() => {
    const keyword = mentionQuery.trim().toLowerCase();
    if (!keyword) {
      return effectiveOptions.slice(0, 8);
    }
    return effectiveOptions
      .filter((option) => option.label.toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [effectiveOptions, mentionQuery]);

  const syncMentionState = useCallback(
    (nextValue: string, cursor: number) => {
      if (!enableUserMention) {
        return;
      }
      const beforeCursor = nextValue.slice(0, cursor);
      const match = beforeCursor.match(/@([^\s@]*)$/);
      if (!match) {
        setMentionOpen(false);
        setMentionQuery("");
        return;
      }
      const query = match[1] ?? "";
      setMentionOpen(true);
      setMentionQuery(query);
      onMentionSearch?.(query);
    },
    [enableUserMention, onMentionSearch],
  );

  function handleChange(nextValue: string) {
    onChange(nextValue);
    const cursor = textareaRef.current?.selectionStart ?? nextValue.length;
    syncMentionState(nextValue, cursor);
  }

  function insertMention(option: OptionItem) {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const beforeCursor = text.slice(0, cursor);
    const afterCursor = text.slice(cursor);
    const match = beforeCursor.match(/@([^\s@]*)$/);
    if (!match) {
      return;
    }
    const prefix = beforeCursor.slice(0, match.index ?? beforeCursor.length);
    const mentionText = `@${option.label} `;
    const nextValue = `${prefix}${mentionText}${afterCursor}`;
    onChange(nextValue);
    setMentionOpen(false);
    setMentionQuery("");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) {
        return;
      }
      const nextCursor = prefix.length + mentionText.length;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  }

  if (!enableUserMention) {
    return (
      <Textarea
        rows={rows}
        className={className}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <div className="lh-user-mention-field">
      <Textarea
        ref={textareaRef}
        rows={rows}
        className={className}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        onClick={(event) => syncMentionState(text, event.currentTarget.selectionStart ?? text.length)}
        onKeyUp={(event) => syncMentionState(text, event.currentTarget.selectionStart ?? text.length)}
      />
      {mentionOpen && filteredOptions.length > 0 ? (
        <ul className="lh-user-mention-field__menu" role="listbox">
          {filteredOptions.map((option) => (
            <li key={String(option.value)}>
              <button
                type="button"
                className="lh-user-mention-field__option"
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(option);
                }}
              >
                <span className="lh-user-mention-field__option-label">{option.label}</span>
                <span className="lh-user-mention-field__option-id">{String(option.value)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
