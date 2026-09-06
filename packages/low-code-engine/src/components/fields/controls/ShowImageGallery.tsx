"use client";

import { useState } from "react";
import { cn } from "../../../lib/utils";
import { formatBytes } from "../upload-types";
import type { ResolvedShowImage, ShowImageDisplayConfig } from "../show-asset-utils";
import { ShowImagePreviewDialog } from "./ShowImagePreviewDialog";
import { ShowImageTile } from "./ShowImageTile";

const THUMB_CLASS = "h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20";

interface ShowImageGalleryProps {
  items: ResolvedShowImage[];
  config: ShowImageDisplayConfig;
  fieldLabel?: string;
}

export function ShowImageGallery({ items, config, fieldLabel }: ShowImageGalleryProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const { multiple, displayMode, previewOnClick, showFileName, fit, maxHeight } = config;

  function renderFileName(item: ResolvedShowImage) {
    if (!showFileName || !item.label) {
      return null;
    }
    return (
      <p
        className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400"
        title={item.label}
      >
        {item.label}
      </p>
    );
  }

  if (displayMode === "list") {
    return (
      <>
        <div className="flex w-full flex-col gap-1.5">
          {items.map((item, index) => (
            <div
              key={`${item.fileId ?? item.directUrl}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <ShowImageTile
                item={item}
                alt={item.alt ?? fieldLabel}
                fit={fit}
                maxHeight={maxHeight}
                previewOnClick={previewOnClick}
                onPreview={() => setPreviewIndex(index)}
                className="h-10 w-10"
                imageClassName="h-full w-full object-cover"
              />
              <div className={cn("min-w-0 flex-1", !showFileName && "hidden")}>
                {item.label ? (
                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100" title={item.label}>
                    {item.label}
                  </p>
                ) : null}
                {item.sizeBytes != null ? (
                  <p className="text-[10px] text-slate-500">{formatBytes(item.sizeBytes)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <ShowImagePreviewDialog items={items} index={previewIndex} onIndexChange={setPreviewIndex} />
      </>
    );
  }

  if (displayMode === "card") {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div key={`${item.fileId ?? item.directUrl}-${index}`} className="w-[7.5rem] shrink-0">
              <ShowImageTile
                item={item}
                alt={item.alt ?? fieldLabel}
                fit={fit}
                maxHeight={maxHeight}
                previewOnClick={previewOnClick}
                onPreview={() => setPreviewIndex(index)}
                className="aspect-[4/3] w-full"
                imageClassName="h-full w-full object-cover"
              />
              {renderFileName(item)}
            </div>
          ))}
        </div>
        <ShowImagePreviewDialog items={items} index={previewIndex} onIndexChange={setPreviewIndex} />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start gap-2">
        {items.map((item, index) => (
          <div
            key={`${item.fileId ?? item.directUrl}-${index}`}
            className={cn("shrink-0", showFileName && !multiple ? "max-w-[10rem]" : undefined)}
          >
            <ShowImageTile
              item={item}
              alt={item.alt ?? fieldLabel}
              fit={fit}
              maxHeight={maxHeight}
              previewOnClick={previewOnClick}
              onPreview={() => setPreviewIndex(index)}
              className={cn(
                THUMB_CLASS,
                !multiple && items.length === 1 && "h-auto max-h-32 w-auto max-w-[10rem]",
              )}
              imageClassName={cn(
                multiple || items.length > 1
                  ? "h-full w-full object-cover"
                  : cn(
                      fit === "cover" ? "h-full w-full object-cover" : "block max-h-32 max-w-[10rem] object-contain",
                    ),
              )}
            />
            {renderFileName(item)}
          </div>
        ))}
      </div>
      <ShowImagePreviewDialog items={items} index={previewIndex} onIndexChange={setPreviewIndex} />
    </>
  );
}
