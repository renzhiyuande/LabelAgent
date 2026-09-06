"use client";

import { FileUp, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { appMessage } from "../../../adapters/lowcode-utils";
import { Button } from '../../../components/ui/button';
import { cn } from "../../../lib/utils";
import type { UploadFieldMeta } from "../../../schema/types";
import {
  formatBytes,
  normalizeUploadedFile,
  resolveFileUploadConfig,
  validateUploadFile,
  type UploadedFileRef,
} from "../upload-types";
import { revokeLocalPreview, uploadFormFile } from "./shared-upload";

interface FileUploadFieldControlProps {
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  upload?: UploadFieldMeta;
  onChange: (value: UploadedFileRef | null) => void;
}

export function FileUploadFieldControl({
  value,
  placeholder,
  disabled,
  upload,
  onChange,
}: FileUploadFieldControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const file = normalizeUploadedFile(value);
  const { maxSizeMb, accept } = resolveFileUploadConfig(upload);

  async function handleFiles(selected: FileList | null) {
    const nextFile = selected?.[0];
    if (!nextFile || disabled || uploading) {
      return;
    }

    const validationError = validateUploadFile(nextFile, { maxSizeMb, accept });
    if (validationError) {
      appMessage.info(validationError);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    setUploading(true);
    try {
      revokeLocalPreview(file);
      const uploaded = await uploadFormFile(nextFile);
      onChange(uploaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : "文件上传失败";
      appMessage.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleRemove() {
    if (disabled || uploading) {
      return;
    }
    revokeLocalPreview(file);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-border bg-muted/50 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)}
              {file.local ? " · 未上传成功，请重新选择" : null}
            </p>
          </div>
          {!disabled ? (
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        disabled={disabled || uploading}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-[0.85rem] border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        {uploading ? "上传中…" : placeholder ?? "点击选择文件"}
      </button>
    </div>
  );
}
