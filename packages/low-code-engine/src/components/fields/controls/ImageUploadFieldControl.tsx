"use client";

import { ImagePlus, Loader2, ZoomIn, X } from "lucide-react";
import { useRef, useState } from "react";
import { appMessage } from "../../../adapters/lowcode-utils";
import { Button } from '../../../components/ui/button';
import { cn } from "../../../lib/utils";
import {
  formatBytes,
  normalizeUploadedFile,
  normalizeUploadedFiles,
  resolveImageUploadConfig,
  validateUploadFile,
  type UploadedFileRef,
} from "../upload-types";
import type { UploadFieldMeta } from "../../../schema/types";
import { ImageUploadPreviewDialog } from "./ImageUploadPreviewDialog";
import { ImageUploadFileName } from "./ImageUploadFileName";
import { revokeLocalPreview, uploadFormFile } from "./shared-upload";
import { AuthenticatedImage } from "./AuthenticatedImage";

interface ImageUploadFieldControlProps {
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  upload?: UploadFieldMeta;
  onChange: (value: UploadedFileRef | UploadedFileRef[] | null) => void;
}

const THUMB_CLASS = "h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20";

interface ImageTileProps {
  file: UploadedFileRef;
  disabled?: boolean;
  previewOnClick: boolean;
  showRemove?: boolean;
  onPreview: () => void;
  onRemove: () => void;
  className?: string;
  imageClassName?: string;
}

function ImageTile({
  file,
  disabled,
  previewOnClick,
  showRemove = true,
  onPreview,
  onRemove,
  className,
  imageClassName,
}: ImageTileProps) {
  return (
    <div className={cn("group relative shrink-0", className)}>
      {file.url ? (
        <button
          type="button"
          disabled={!previewOnClick}
          className={cn(
            "relative block h-full w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900",
            previewOnClick && "cursor-zoom-in transition hover:ring-2 hover:ring-primary/50",
            !previewOnClick && "cursor-default",
          )}
          onClick={() => previewOnClick && onPreview()}
        >
          {file.id && !file.local ? (
            <AuthenticatedImage
              file={file}
              alt={file.name}
              className={imageClassName ?? "h-full w-full object-cover"}
            />
          ) : (
            <img
              src={file.url}
              alt={file.name}
              title={file.name}
              className={imageClassName ?? "h-full w-full object-cover"}
            />
          )}
          {previewOnClick ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
              <ZoomIn className="h-5 w-5 text-white drop-shadow" />
            </span>
          ) : null}
        </button>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] text-slate-400 dark:border-slate-700">
          无预览
        </div>
      )}
      {showRemove && !disabled ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute -right-1 -top-1 z-10 h-5 w-5 rounded-full bg-white/95 p-0 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-slate-900"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
}

export function ImageUploadFieldControl({
  value,
  placeholder,
  disabled,
  upload,
  onChange,
}: ImageUploadFieldControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const { multiple, maxCount, maxSizeMb, accept, displayMode, previewOnClick, showFileName, allowRename } =
    resolveImageUploadConfig(upload);
  const files = multiple ? normalizeUploadedFiles(value) : normalizeUploadedFile(value) ? [normalizeUploadedFile(value)!] : [];
  const canAddMore = multiple ? files.length < maxCount : files.length === 0;

  async function handleFiles(selected: FileList | null) {
    if (!selected?.length || disabled || uploading) {
      return;
    }

    const validFiles: File[] = [];
    for (const file of Array.from(selected)) {
      const validationError = validateUploadFile(file, { maxSizeMb, accept });
      if (validationError) {
        appMessage.info(validationError);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) {
      return;
    }

    const remaining = multiple ? maxCount - files.length : 1;
    const toUpload = validFiles.slice(0, remaining);
    if (validFiles.length > remaining) {
      appMessage.info(`最多还可上传 ${remaining} 张，已忽略多余文件`);
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(toUpload.map((file) => uploadFormFile(file, "image")));
      if (multiple) {
        onChange([...files, ...uploaded]);
      } else {
        revokeLocalPreview(files[0]);
        onChange(uploaded[0] ?? null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "图片上传失败";
      appMessage.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleRemove(index: number) {
    if (disabled || uploading) {
      return;
    }
    revokeLocalPreview(files[index]);
    if (previewIndex === index) {
      setPreviewIndex(null);
    }
    if (multiple) {
      const next = files.filter((_, itemIndex) => itemIndex !== index);
      onChange(next.length > 0 ? next : []);
      return;
    }
    onChange(null);
  }

  function handleRename(index: number, name: string) {
    if (disabled || uploading) {
      return;
    }
    const next = files.map((file, itemIndex) => (itemIndex === index ? { ...file, name } : file));
    if (multiple) {
      onChange(next);
      return;
    }
    onChange(next[0] ?? null);
  }

  function openPicker() {
    if (!disabled && !uploading && canAddMore) {
      inputRef.current?.click();
    }
  }

  const addLabel =
    placeholder ??
    (multiple ? (files.length > 0 ? "添加" : `上传（0/${maxCount}）`) : "上传图片");

  function renderAddButton(className?: string) {
    if (!canAddMore) {
      return null;
    }
    return (
      <button
        type="button"
        disabled={disabled || uploading}
        title={addLabel}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white text-[10px] text-slate-500 transition hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-primary dark:hover:bg-primary/30",
          displayMode === "list"
            ? "h-9 w-full px-2 text-xs"
            : displayMode === "card"
              ? "aspect-[4/3] w-full max-w-[7.5rem] flex-col py-2"
              : cn(THUMB_CLASS, "flex-col gap-0.5", !multiple && files.length === 0 && "h-auto min-h-[4.5rem] w-full max-w-none px-3 py-3 text-xs sm:min-h-20"),
          className,
        )}
        onClick={openPicker}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        <span className="max-w-full truncate px-1">{uploading ? "上传中" : addLabel}</span>
      </button>
    );
  }

  function renderFileName(file: UploadedFileRef, index: number, className?: string, subtitle?: string) {
    if (!showFileName) {
      return null;
    }
    if (allowRename && !disabled) {
      return (
        <ImageUploadFileName
          file={file}
          disabled={disabled}
          allowRename
          className={className}
          subtitle={subtitle}
          textClassName={subtitle ? undefined : className}
          onRename={(name) => handleRename(index, name)}
        />
      );
    }
    return (
      <div className={cn("min-w-0", className)}>
        <p
          className={cn(
            "truncate text-[10px] text-slate-500 dark:text-slate-400",
            subtitle && "text-xs font-medium text-slate-800 dark:text-slate-100",
          )}
          title={file.name}
        >
          {file.name}
        </p>
        {subtitle ? <p className="text-[10px] text-slate-500">{subtitle}</p> : null}
      </div>
    );
  }

  function renderFiles() {
    if (displayMode === "list") {
      return (
        <div className="flex w-full flex-col gap-1.5">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <ImageTile
                file={file}
                disabled={disabled}
                previewOnClick={previewOnClick}
                showRemove={false}
                onPreview={() => setPreviewIndex(index)}
                onRemove={() => handleRemove(index)}
                className="h-10 w-10"
                imageClassName="h-full w-full object-cover"
              />
              <div className={cn("min-w-0 flex-1", !showFileName && "hidden")}>
                {renderFileName(file, index, undefined, formatBytes(file.size))}
              </div>
              {!disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
          {renderAddButton()}
        </div>
      );
    }

    if (displayMode === "card") {
      return (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="w-[7.5rem] shrink-0">
              <ImageTile
                file={file}
                disabled={disabled}
                previewOnClick={previewOnClick}
                onPreview={() => setPreviewIndex(index)}
                onRemove={() => handleRemove(index)}
                className="aspect-[4/3] w-full"
                imageClassName="h-full w-full object-cover"
              />
              {renderFileName(file, index, "mt-0.5")}
            </div>
          ))}
          {renderAddButton()}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-start gap-2">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className={cn("shrink-0", showFileName && !multiple ? "max-w-[10rem]" : undefined)}
          >
            <ImageTile
              file={file}
              disabled={disabled}
              previewOnClick={previewOnClick}
              onPreview={() => setPreviewIndex(index)}
              onRemove={() => handleRemove(index)}
              className={cn(THUMB_CLASS, !multiple && "h-auto max-h-32 w-auto max-w-[10rem]")}
              imageClassName={cn(
                multiple ? "h-full w-full object-cover" : "block max-h-32 max-w-[10rem] object-contain",
              )}
            />
            {renderFileName(
              file,
              index,
              cn("mt-0.5 max-w-[5.5rem] sm:max-w-[6.5rem]", !multiple && "max-w-[10rem]"),
            )}
          </div>
        ))}
        {renderAddButton()}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled || uploading || !canAddMore}
        onChange={(event) => void handleFiles(event.target.files)}
      />

      {renderFiles()}

      {!canAddMore && multiple ? (
        <p className="text-[11px] text-slate-500">已达上限 {maxCount} 张</p>
      ) : null}

      <ImageUploadPreviewDialog
        files={files}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
      />
    </div>
  );
}
