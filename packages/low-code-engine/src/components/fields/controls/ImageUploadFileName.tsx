"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from '../../../components/ui/input';
import { cn } from "../../../lib/utils";
import type { UploadedFileRef } from "../upload-types";

function preserveExtension(originalName: string, nextName: string): string {
  const trimmed = nextName.trim();
  if (!trimmed) {
    return originalName;
  }
  const dotIndex = originalName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return trimmed;
  }
  const ext = originalName.slice(dotIndex);
  if (!trimmed.includes(".")) {
    return `${trimmed}${ext}`;
  }
  return trimmed;
}

interface ImageUploadFileNameProps {
  file: UploadedFileRef;
  disabled?: boolean;
  allowRename?: boolean;
  className?: string;
  textClassName?: string;
  subtitle?: string;
  onRename: (name: string) => void;
}

export function ImageUploadFileName({
  file,
  disabled,
  allowRename = false,
  className,
  textClassName,
  subtitle,
  onRename,
}: ImageUploadFileNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(file.name);
    }
  }, [file.name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commitRename() {
    setEditing(false);
    const next = preserveExtension(file.name, draft);
    if (next !== file.name) {
      onRename(next);
    }
    setDraft(next);
  }

  if (editing && allowRename && !disabled) {
    return (
      <div className={cn("min-w-0", className)}>
        <Input
          ref={inputRef}
          value={draft}
          className={cn("h-7 w-full min-w-0 max-w-full px-2 text-xs", textClassName)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitRename();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(file.name);
              setEditing(false);
            }
          }}
        />
        {subtitle ? <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("group/name flex min-w-0 items-start gap-1", className)}>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[10px] text-slate-500 dark:text-slate-400",
            subtitle && "text-xs font-medium text-slate-800 dark:text-slate-100",
            textClassName,
          )}
          title={file.name}
        >
          {file.name}
        </p>
        {subtitle ? <p className="text-[10px] text-slate-500">{subtitle}</p> : null}
      </div>
      {allowRename && !disabled ? (
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition hover:text-primary group-hover/name:opacity-100 focus:opacity-100 dark:hover:text-primary/70"
          title="修改图片名"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
