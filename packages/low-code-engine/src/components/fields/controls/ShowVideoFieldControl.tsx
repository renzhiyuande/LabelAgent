"use client";

import { Loader2 } from "lucide-react";
import type { FormFieldSchema } from "../../../schema/types";
import { useAuthenticatedFileUrl } from "../../../adapters/asset-adapter";
import { cn } from "../../../lib/utils";
import {
  resolveShowVideoDisplay,
  resolveShowVideoDisplayConfig,
} from "../show-asset-utils";

interface ShowVideoFieldControlProps {
  field: FormFieldSchema;
  value?: unknown;
}

function ShowVideoPlayer({
  field,
  value,
}: ShowVideoFieldControlProps) {
  const resolved = resolveShowVideoDisplay(field, value);
  const config = resolveShowVideoDisplayConfig(field.showVideo);
  const src = useAuthenticatedFileUrl(resolved?.fileId, resolved?.directUrl);

  if (!resolved) {
    return <p className="text-sm text-muted-foreground">暂无视频</p>;
  }

  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
        style={{ maxHeight: config.maxHeight, minHeight: 120 }}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <figure className="space-y-1">
      <video
        src={src}
        className={cn(
          "w-full max-w-full rounded-md border border-slate-200 bg-black dark:border-slate-700",
        )}
        style={{ maxHeight: config.maxHeight }}
        controls={config.controls}
        autoPlay={config.autoPlay}
        muted={config.muted}
        loop={config.loop}
        playsInline
        preload="metadata"
      />
      {config.showFileName && resolved.name ? (
        <figcaption className="text-xs text-muted-foreground">{resolved.name}</figcaption>
      ) : null}
    </figure>
  );
}

export function ShowVideoFieldControl({ field, value }: ShowVideoFieldControlProps) {
  return <ShowVideoPlayer field={field} value={value} />;
}
