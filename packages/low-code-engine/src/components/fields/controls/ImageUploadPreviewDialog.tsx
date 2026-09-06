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
import { formatBytes, type UploadedFileRef } from "../upload-types";

interface ImageUploadPreviewDialogProps {
  files: UploadedFileRef[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

export function ImageUploadPreviewDialog({ files, index, onIndexChange }: ImageUploadPreviewDialogProps) {
  const open = index != null && index >= 0 && index < files.length;
  const file = open ? files[index] : null;

  function go(delta: number) {
    if (index == null || files.length <= 1) {
      return;
    }
    const next = (index + delta + files.length) % files.length;
    onIndexChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onIndexChange(null)}>
      <DialogContent className="max-w-3xl gap-3 overflow-hidden p-4 sm:p-5">
        <DialogHeader className="min-w-0 space-y-1 pr-10">
          <DialogTitle className="min-w-0 truncate text-base" title={file?.name}>
            {file?.name ?? "图片预览"}
          </DialogTitle>
          {file ? (
            <DialogDescription>
              {formatBytes(file.size)}
              {files.length > 1 ? ` · ${(index ?? 0) + 1} / ${files.length}` : ""}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {file?.url ? (
          <div className="relative flex min-h-[12rem] items-center justify-center rounded-lg bg-slate-950/5 dark:bg-slate-900">
            <img
              src={file.url}
              alt={file.name}
              className="max-h-[70vh] max-w-full object-contain"
            />
            {files.length > 1 ? (
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
