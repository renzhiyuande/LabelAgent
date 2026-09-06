"use client";

import { FileText, Loader2 } from "lucide-react";
import type { FormFieldSchema } from "../../../schema/types";
import { openAuthenticatedDownload, resolveFileDownloadUrl } from "../../../adapters/asset-adapter";
import { appMessage } from "../../../adapters/lowcode-utils";
import { formatBytes } from "../upload-types";
import { resolveShowFileDisplay } from "../show-asset-utils";

interface ShowFileFieldControlProps {
  field: FormFieldSchema;
  value?: unknown;
  /** 是否应用 showFile.maxHeight；设计器画布预览传 false */
  constrainHeight?: boolean;
}

export function ShowFileFieldControl({ field, value, constrainHeight = true }: ShowFileFieldControlProps) {
  const resolved = resolveShowFileDisplay(field, value);
  const showSize = field.showFile?.showSize !== false;

  if (!resolved) {
    return <p className="text-sm text-muted-foreground">暂无文件</p>;
  }

  const href =
    resolved.directUrl ??
    (resolved.fileId != null ? resolveFileDownloadUrl(undefined, resolved.fileId) : undefined);

  async function openFile() {
    if (!href || !resolved) {
      return;
    }
    try {
      await openAuthenticatedDownload({
        url: href,
        fileId: resolved.fileId ?? undefined,
        fileName: resolved.name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "文件下载失败";
      appMessage.error(message);
    }
  }

  const maxHeight =
    constrainHeight && field.showFile?.maxHeight != null && field.showFile.maxHeight > 0
      ? field.showFile.maxHeight
      : undefined;

  const button = (
    <button
      type="button"
      onClick={() => void openFile()}
      className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
    >
      <FileText className="h-4 w-4 shrink-0 text-slate-500" />
      <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">{resolved.name}</span>
      {showSize && resolved.sizeBytes ? (
        <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(resolved.sizeBytes)}</span>
      ) : null}
      {!href ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
    </button>
  );

  if (maxHeight != null && maxHeight > 0) {
    return (
      <div className="flex items-start" style={{ minHeight: maxHeight }}>
        {button}
      </div>
    );
  }

  return button;
}
