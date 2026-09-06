"use client";

import { ZoomIn } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAuthenticatedFileUrl } from "../../../adapters/asset-adapter";
import type { ResolvedShowImage } from "../show-asset-utils";

interface ShowImageTileProps {
  item: ResolvedShowImage;
  alt?: string;
  fit: "contain" | "cover";
  maxHeight: number;
  previewOnClick: boolean;
  onPreview: () => void;
  className?: string;
  imageClassName?: string;
}

function TileImage({
  item,
  alt,
  fit,
  maxHeight,
  imageClassName,
}: Pick<ShowImageTileProps, "item" | "alt" | "fit" | "maxHeight" | "imageClassName">) {
  const previewUrl = useAuthenticatedFileUrl(item.fileId, item.directUrl);

  if (!previewUrl) {
    return (
      <div
        className={cn("animate-pulse bg-slate-200 dark:bg-slate-800", imageClassName)}
        style={!imageClassName?.includes("h-full") ? { maxHeight } : undefined}
      />
    );
  }

  return (
    <img
      src={previewUrl}
      alt={alt ?? item.label ?? "图片"}
      title={item.label}
      className={imageClassName}
      style={fit === "contain" && !imageClassName?.includes("object-cover") ? { maxHeight } : undefined}
    />
  );
}

export function ShowImageTile({
  item,
  alt,
  fit,
  maxHeight,
  previewOnClick,
  onPreview,
  className,
  imageClassName,
}: ShowImageTileProps) {
  return (
    <div className={cn("group relative shrink-0", className)}>
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
        <TileImage item={item} alt={alt} fit={fit} maxHeight={maxHeight} imageClassName={imageClassName} />
        {previewOnClick ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
            <ZoomIn className="h-5 w-5 text-white drop-shadow" />
          </span>
        ) : null}
      </button>
    </div>
  );
}
