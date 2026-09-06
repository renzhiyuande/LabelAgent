"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { useAuthenticatedFileUrl } from "../../../adapters/asset-adapter";
import { formatBytes } from "../upload-types";
import type { ResolvedShowImage } from "../show-asset-utils";

interface ShowImagePreviewDialogProps {
  items: ResolvedShowImage[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

function PreviewSlide({ item }: { item: ResolvedShowImage }) {
  const previewUrl = useAuthenticatedFileUrl(item.fileId, item.directUrl);

  if (!previewUrl) {
    return <div className="h-[40vh] animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />;
  }

  return (
    <img
      src={previewUrl}
      alt={item.alt ?? item.label ?? "图片预览"}
      className="max-h-[70vh] max-w-full object-contain"
    />
  );
}

export function ShowImagePreviewDialog({ items, index, onIndexChange }: ShowImagePreviewDialogProps) {
  const open = index != null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;

  function go(delta: number) {
    if (index == null || items.length <= 1) {
      return;
    }
    const next = (index + delta + items.length) % items.length;
    onIndexChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onIndexChange(null)}>
      <DialogContent className="max-w-3xl gap-3 overflow-hidden p-4 sm:p-5">
        <DialogHeader className="min-w-0 space-y-1 pr-10">
          <DialogTitle className="min-w-0 truncate text-base" title={item?.label}>
            {item?.label ?? item?.alt ?? "图片预览"}
          </DialogTitle>
          {item ? (
            <DialogDescription>
              {item.sizeBytes != null ? formatBytes(item.sizeBytes) : null}
              {items.length > 1 ? ` · ${(index ?? 0) + 1} / ${items.length}` : ""}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {item ? (
          <div className="relative flex min-h-[12rem] items-center justify-center rounded-lg bg-slate-950/5 dark:bg-slate-900">
            <PreviewSlide item={item} />
            {items.length > 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-white/90"
                  onClick={() => go(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-white/90"
                  onClick={() => go(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">无法预览该图片</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
