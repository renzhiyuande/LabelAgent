"use client";

import { useAuthenticatedFileUrl } from "../../../adapters/asset-adapter";
import { cn } from "../../../lib/utils";
import type { UploadedFileRef } from "../upload-types";

interface AuthenticatedImageProps {
  file: UploadedFileRef;
  alt?: string;
  className?: string;
}

export function AuthenticatedImage({ file, alt, className }: AuthenticatedImageProps) {
  const fileId = file.local ? null : file.id;
  const previewUrl = useAuthenticatedFileUrl(fileId ?? null, file.url);

  if (!previewUrl) {
    return <div className={cn("animate-pulse bg-slate-200 dark:bg-slate-800", className)} />;
  }

  return <img src={previewUrl} alt={alt ?? file.name} className={className} />;
}
