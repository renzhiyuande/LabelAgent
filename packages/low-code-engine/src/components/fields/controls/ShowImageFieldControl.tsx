"use client";

import { useState } from "react";
import type { FormFieldSchema } from "../../../schema/types";
import {
  resolveShowImageDisplayConfig,
  resolveShowImageDisplayList,
  type ResolvedShowImage,
  type ShowImageDisplayConfig,
} from "../show-asset-utils";
import { ShowImageGallery } from "./ShowImageGallery";
import { ShowImagePreviewDialog } from "./ShowImagePreviewDialog";
import { ShowImageTile } from "./ShowImageTile";

interface ShowImageFieldControlProps {
  field: FormFieldSchema;
  value?: unknown;
}

function ShowImageSingleDisplay({
  item,
  config,
  fieldLabel,
}: {
  item: ResolvedShowImage;
  config: ShowImageDisplayConfig;
  fieldLabel?: string;
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  return (
    <>
      <figure className="space-y-1">
        <ShowImageTile
          item={item}
          alt={item.alt ?? fieldLabel}
          fit={config.fit}
          maxHeight={config.maxHeight}
          previewOnClick={config.previewOnClick}
          onPreview={() => setPreviewIndex(0)}
          className="w-full max-w-full"
          imageClassName={
            config.fit === "cover"
              ? "w-full rounded-md border border-slate-200 object-cover dark:border-slate-700"
              : "max-w-full rounded-md border border-slate-200 object-contain dark:border-slate-700"
          }
        />
        {config.showFileName && item.label ? (
          <figcaption className="text-xs text-muted-foreground">{item.label}</figcaption>
        ) : null}
      </figure>
      <ShowImagePreviewDialog items={[item]} index={previewIndex} onIndexChange={setPreviewIndex} />
    </>
  );
}

export function ShowImageFieldControl({ field, value }: ShowImageFieldControlProps) {
  const config = resolveShowImageDisplayConfig(field.showImage);
  const items = resolveShowImageDisplayList(field, value);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无图片</p>;
  }

  if (items.length === 1 && !config.multiple) {
    return <ShowImageSingleDisplay item={items[0]} config={config} fieldLabel={field.label} />;
  }

  return <ShowImageGallery items={items} config={config} fieldLabel={field.label} />;
}
